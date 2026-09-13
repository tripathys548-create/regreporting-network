import { PrismaClient } from "@prisma/client";
import { COMMENTS, DISCUSSIONS } from "../data/discussions";
import { CONTENT_REPORTS, NOTIFICATIONS } from "../data/notifications";
import { UPDATES } from "../data/updates";
import { DEMO_USER_ID, PROFILES, USERS } from "../data/users";
import { hashPassword } from "../lib/auth/password";
import { FEEDS } from "../lib/ingestion/feeds";

/*
 * Resets community data (members, discussions, replies, notifications, reports)
 * and registers the official feeds. Ingested regulatory updates and ingestion
 * history are kept. Demo regulatory updates are loaded as "archived" so they do
 * not appear next to real regulator news; set SEED_DEMO_UPDATES="true" to
 * publish them instead.
 */

const prisma = new PrismaClient();

const DEMO_ORGANISATIONS: Record<string, string> = {
  "Sell-side bank": "Example Global Bank (demo)",
  "Buy-side firm": "Example Asset Management (demo)",
  "Trade repository": "Example Trade Repository (demo)",
  Consultancy: "Example Advisory (demo)",
  "Technology vendor": "Example RegTech (demo)",
  Regulator: "Example Authority (demo)",
  Corporate: "Example Corporate (demo)",
};

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Refusing to load demo members and passwords into a production database. Use `npm run setup:production` instead.");
  }
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) throw new Error("Set SEED_DEMO_PASSWORD in .env before seeding demo data.");
  const publishDemoUpdates = process.env.SEED_DEMO_UPDATES === "true";

  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.contentReport.deleteMany(),
    prisma.userFollow.deleteMany(),
    prisma.savedDiscussion.deleteMany(),
    prisma.commentVote.deleteMany(),
    prisma.discussionVote.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.discussion.deleteMany(),
    prisma.session.deleteMany(),
    prisma.emailVerification.deleteMany(),
    prisma.outboundEmail.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.regulatoryUpdate.deleteMany({ where: { isDemo: true } }),
  ]);

  for (const user of USERS) {
    const profile = PROFILES.find((p) => p.userId === user.id);
    if (!profile) continue;
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: user.id === DEMO_USER_ID ? await hashPassword(demoPassword) : null,
        emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
        role: user.role,
        status: user.status,
        createdAt: new Date(user.createdAt),
        profile: {
          create: {
            handle: profile.handle,
            displayName: profile.displayName,
            jobTitle: profile.jobTitle,
            organisationName: DEMO_ORGANISATIONS[profile.organisationType] ?? "Example Organisation (demo)",
            organisationType: profile.organisationType,
            yearsExperience: profile.yearsExperience,
            location: profile.location,
            bio: profile.bio,
            expertise: profile.expertise,
            verifiedPractitioner: profile.verifiedPractitioner,
            createdAt: new Date(profile.joinedAt),
          },
        },
      },
    });
  }

  for (const d of DISCUSSIONS) {
    await prisma.discussion.create({
      data: {
        id: d.id,
        slug: d.slug,
        title: d.title,
        body: d.body,
        authorId: d.authorId,
        category: d.category,
        tags: d.tags,
        status: d.status,
        origin: d.origin,
        viewCount: d.viewCount,
        voteScore: d.voteScore,
        replyCount: COMMENTS.filter((c) => c.discussionId === d.id).length,
        acceptedCommentId: d.acceptedCommentId,
        createdAt: new Date(d.createdAt),
        lastActivityAt: new Date(d.lastActivityAt),
      },
    });
  }

  for (const c of COMMENTS) {
    await prisma.comment.create({
      data: {
        id: c.id,
        discussionId: c.discussionId,
        parentId: c.parentId,
        authorId: c.authorId,
        body: c.body,
        voteScore: c.voteScore,
        isAccepted: c.isAccepted,
        knowledgeBaseCandidate: c.knowledgeBaseCandidate,
        status: c.status,
        createdAt: new Date(c.createdAt),
      },
    });
  }

  for (const n of NOTIFICATIONS.filter((n) => publishDemoUpdates || !["regulatory-alert", "followed-source"].includes(n.type))) {
    await prisma.notification.create({
      data: { id: n.id, userId: n.userId, type: n.type, title: n.title, body: n.body, href: n.href, createdAt: new Date(n.createdAt), readAt: n.readAt ? new Date(n.readAt) : null },
    });
  }

  for (const r of CONTENT_REPORTS) {
    await prisma.contentReport.create({
      data: { id: r.id, targetType: r.targetType, targetId: r.targetId, reporterId: r.reporterId, reason: r.reason, detail: r.detail, status: r.status, createdAt: new Date(r.createdAt) },
    });
  }

  for (const u of UPDATES) {
    await prisma.regulatoryUpdate.create({
      data: {
        id: u.id,
        sourceId: u.sourceId,
        title: u.title,
        summary: u.summary,
        category: u.category,
        topics: u.topics,
        jurisdiction: u.jurisdiction,
        publishedAt: new Date(u.publishedAt),
        // Demo items point at publisher homepages; a fragment keeps each URL unique.
        originalUrl: `${u.originalUrl}#demo-${u.id}`,
        severity: u.severity,
        isAlert: publishDemoUpdates && u.isAlert,
        status: publishDemoUpdates ? u.status : "archived",
        isDemo: true,
        ingestedFrom: "demo-seed",
        reviewNote: "Example / Demo Content — not a real publication.",
      },
    });
  }

  for (const feed of FEEDS) {
    await prisma.sourceFeed.upsert({ where: { id: feed.id }, create: feed, update: { label: feed.label, url: feed.url, sourceId: feed.sourceId } });
  }

  const [users, discussions, updates, pending, feeds] = await Promise.all([
    prisma.user.count(),
    prisma.discussion.count(),
    prisma.regulatoryUpdate.count(),
    prisma.regulatoryUpdate.count({ where: { status: "pending-review" } }),
    prisma.sourceFeed.count(),
  ]);
  console.log(`Seeded ${users} users, ${discussions} discussions; ${updates} regulatory updates in database (${pending} awaiting review); ${feeds} feeds registered.`);
  console.log(`Demo updates ${publishDemoUpdates ? "published" : "archived"}. Demo admin: demo@regreporting.network (password from SEED_DEMO_PASSWORD)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
