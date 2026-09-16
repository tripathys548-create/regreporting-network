import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminAction } from "@/components/admin/AdminAction";
import { NewsletterCampaignRow, NewsletterComposer } from "@/components/admin/NewsletterCampaignEditor";
import { NewsletterSettingsForm } from "@/components/admin/NewsletterSettingsForm";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { RunIngestionButton } from "@/components/admin/RunIngestionButton";
import { EditUpdateToggle, ManualUpdateForm } from "@/components/admin/UpdateEditor";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, TopicBadge, type BadgeTone } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { DemoContentLabel, SourceBadge } from "@/components/ui/SourceLabels";
import { EmptyState } from "@/components/ui/States";
import { SOURCES } from "@/data/sources";
import { isStaff, requirePageSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { firstParam, type SearchParams } from "@/lib/params";
import {
  getAdminOverview,
  getSecurityOverview,
  listAuditLog,
  listFeedsAndRuns,
  listRemovedContent,
  listReportsForModeration,
  listSecurityAlerts,
  listSecurityEvents,
  listSuggestionsForAdmin,
  listUpdatesForReview,
  listUsersForAdmin,
  type AdminSection,
  type UpdateQueue,
} from "@/lib/repositories/admin";
import { getCampaignStats, getNewsletterAdminOverview, getNewsletterSettings, getWelcomeEmailStats, listNewsletterCampaigns, newsletterEmailConfigured } from "@/lib/repositories/newsletter";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const QUEUES: { id: UpdateQueue; label: string }[] = [
  { id: "pending-review", label: "Awaiting review" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
  { id: "rejected", label: "Rejected" },
];

const STATUS_TONE: Record<string, BadgeTone> = { active: "good", pending: "signal", suspended: "bad", ok: "good", error: "bad", running: "accent" };

async function UpdatesSection({ queue, isAdmin }: { queue: UpdateQueue; isAdmin: boolean }) {
  const { rows, counts } = await listUpdatesForReview(queue);
  return (
    <>
      <nav aria-label="Update queues" className="flex flex-wrap gap-1 border-b border-line px-4 py-2">
        {QUEUES.map((q) => (
          <Link
            key={q.id}
            href={`/admin?section=updates&queue=${q.id}`}
            aria-current={q.id === queue ? "true" : undefined}
            className={clsx("rounded-md px-2.5 py-1 text-xs font-medium", q.id === queue ? "bg-navy text-white" : "text-body hover:bg-canvas")}
          >
            {q.label} <span className="font-mono">{counts[q.id]}</span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState
          icon="radar"
          title={queue === "pending-review" ? "Nothing awaiting review" : "No updates in this queue"}
          description={queue === "pending-review" ? "Fetch the official feeds from Sources & Ingestion, or add an update manually." : undefined}
          action={queue === "pending-review" && isAdmin ? <RunIngestionButton /> : undefined}
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((u) => {
            const source = SOURCES.find((s) => s.id === u.sourceId);
            const endpoint = `/api/admin/updates/${u.id}`;
            return (
              <li key={u.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SourceBadge name={source?.shortName ?? u.sourceId} verified={source?.verifiedDomain} />
                  <TopicBadge topic={u.category} />
                  {u.severity !== "standard" && <Badge tone={u.severity === "critical" ? "bad" : "signal"}>{u.severity}</Badge>}
                  {u.isAlert && <Badge tone="signal">Alert banner</Badge>}
                  {u.isDemo && <DemoContentLabel compact />}
                  <span className="font-mono text-2xs text-muted" title="Relevance score from the classifier">
                    relevance {u.relevanceScore}
                  </span>
                  <span className="text-2xs text-muted">
                    · published {formatDate(u.publishedAt)} · {u.ingestedFrom === "manual" ? "added manually" : u.ingestedFrom ? `via ${u.ingestedFrom}` : "seed"}
                  </span>
                </div>
                <a href={u.originalUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-start gap-1 text-sm font-semibold text-ink hover:text-accent">
                  {u.title}
                  <Icon name="external" className="mt-1 h-3 w-3 shrink-0 text-muted" />
                </a>
                <p className="mt-0.5 break-words text-xs text-body">{u.summary}</p>
                {u.topics.length > 1 && <p className="mt-1 text-2xs text-muted">Topics: {u.topics.join(", ")}</p>}
                {(u.reviewNote || u.reviewerName) && (
                  <p className="mt-1 text-2xs text-muted">
                    {u.reviewerName && (
                      <>
                        Reviewed by {u.reviewerName}
                        {u.reviewedAt && (
                          <>
                            {" "}
                            <RelativeTime iso={u.reviewedAt} />
                          </>
                        )}
                        {u.reviewNote && " · "}
                      </>
                    )}
                    {u.reviewNote}
                  </p>
                )}
                {isAdmin && (
                  <div className="mt-2 flex flex-wrap items-start gap-1.5">
                    {u.status !== "published" && <AdminAction endpoint={endpoint} body={{ action: "approve" }} label="Approve & publish" icon="check" variant="primary" />}
                    {u.status === "pending-review" && <AdminAction endpoint={endpoint} body={{ action: "reject" }} label="Reject" icon="x" reasonPrompt="Reason for rejection (internal)" reasonField="note" />}
                    {u.status !== "archived" && <AdminAction endpoint={endpoint} body={{ action: "archive" }} label={u.status === "published" ? "Unpublish" : "Archive"} icon="layers" variant="ghost" />}
                    {u.status !== "pending-review" && u.status !== "published" && <AdminAction endpoint={endpoint} body={{ action: "requeue" }} label="Back to review" icon="refresh" variant="ghost" />}
                    <EditUpdateToggle update={{ id: u.id, title: u.title, summary: u.summary, category: u.category, topics: u.topics, severity: u.severity, isAlert: u.isAlert, status: u.status }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

async function SourcesSection() {
  const { feeds, runs, emailConfigured, emailFailures7d } = await listFeedsAndRuns();
  return (
    <div className="divide-y divide-line">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="max-w-xl text-xs text-body">
          Feeds are fetched on demand here or with <code className="font-mono">npm run ingest</code> (schedule it with cron). New items are classified for relevance and wait for review;
          nothing is published automatically.
        </p>
        <RunIngestionButton />
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-xs">
          <thead className="bg-canvas/50 text-2xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">Feed</th>
              <th scope="col" className="px-4 py-2 font-semibold">Last fetch</th>
              <th scope="col" className="px-4 py-2 font-semibold">Status</th>
              <th scope="col" className="px-4 py-2 font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {feeds.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <SourceBadge name={f.sourceShortName} />
                    <span className="font-medium text-ink">{f.label}</span>
                  </div>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-mono text-2xs text-muted hover:text-accent">
                    {f.url}
                  </a>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-muted">{f.lastFetchedAt ? <RelativeTime iso={f.lastFetchedAt} /> : "Never"}</td>
                <td className="px-4 py-2">
                  {f.lastStatus ? <Badge tone={STATUS_TONE[f.lastStatus] ?? "neutral"}>{f.lastStatus === "ok" ? `OK · ${f.lastItemCount} items` : "Error"}</Badge> : <Badge tone="outline">Not run</Badge>}
                  {f.lastError && <p className="mt-1 max-w-xs break-words text-2xs text-bad">{f.lastError}</p>}
                </td>
                <td className="px-4 py-2 text-right">
                  <RunIngestionButton feedId={f.id} label="Fetch" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 px-4 py-3">
        <p className="text-xs text-body">DTCC and CPMI do not publish feeds. Add their updates from the official page:</p>
        <ManualUpdateForm />
      </div>
      <div className="px-4 py-3">
        <h3 className="mb-2 text-xs font-semibold text-ink">Recent ingestion runs</h3>
        {runs.length === 0 ? (
          <p className="text-xs text-muted">No runs yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left font-mono text-2xs">
              <thead className="text-muted">
                <tr>
                  {["Started", "Feed", "Status", "Fetched", "Review", "Archived", "Dupes", "Old", "Rejected"].map((h) => (
                    <th key={h} scope="col" className="py-1 pr-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-line" title={r.error ?? undefined}>
                    <td className="py-1 pr-3"><RelativeTime iso={r.startedAt} /></td>
                    <td className="py-1 pr-3">{r.feedId}</td>
                    <td className={clsx("py-1 pr-3", r.status === "error" ? "text-bad" : "text-good")}>{r.status}</td>
                    <td className="py-1 pr-3">{r.fetched}</td>
                    <td className="py-1 pr-3">{r.pending}</td>
                    <td className="py-1 pr-3">{r.archived}</td>
                    <td className="py-1 pr-3">{r.duplicates}</td>
                    <td className="py-1 pr-3">{r.skippedOld}</td>
                    <td className="py-1 pr-3">{r.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs">
        <Icon name="mail" className="text-muted" />
        <span className="font-semibold text-ink">Email delivery</span>
        {emailConfigured ? <Badge tone="good">SMTP configured</Badge> : <Badge tone="signal">Not configured — emails go to /dev/mailbox</Badge>}
        {emailFailures7d > 0 && <Badge tone="bad">{emailFailures7d} failed in 7 days</Badge>}
      </div>
    </div>
  );
}

async function ReportsSection({ view }: { view: "open" | "resolved" }) {
  const reports = await listReportsForModeration(view);
  return (
    <>
      <nav aria-label="Report status" className="flex gap-1 border-b border-line px-4 py-2">
        {(["open", "resolved"] as const).map((v) => (
          <Link key={v} href={`/admin?section=reports&view=${v}`} aria-current={v === view ? "true" : undefined} className={clsx("rounded-md px-2.5 py-1 text-xs font-medium capitalize", v === view ? "bg-navy text-white" : "text-body hover:bg-canvas")}>
            {v}
          </Link>
        ))}
      </nav>
      {reports.length === 0 ? (
        <EmptyState icon="flag" title={view === "open" ? "No open reports" : "No resolved reports"} />
      ) : (
        <ul className="divide-y divide-line">
          {reports.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={r.reason === "misleading-regulatory-claim" || r.reason === "confidential-data" ? "bad" : "neutral"}>{r.reason.replace(/-/g, " ")}</Badge>
                <Badge tone="outline">{r.targetType}</Badge>
                {r.target.status === "removed" && <Badge tone="bad">Content removed</Badge>}
                {view === "resolved" && <Badge tone={r.status === "actioned" ? "good" : "outline"}>{r.status}</Badge>}
                <span className="text-2xs text-muted">
                  Reported by {r.reporterName} · <RelativeTime iso={r.createdAt} />
                </span>
              </div>
              <div className="mt-2 rounded-md border border-line bg-canvas px-3 py-2">
                {r.target.href ? (
                  <Link href={r.target.href} className="text-xs font-semibold text-ink hover:text-accent">
                    {r.target.title}
                  </Link>
                ) : (
                  <p className="text-xs font-semibold text-muted">{r.target.title}</p>
                )}
                {r.target.authorName && <p className="text-2xs text-muted">by {r.target.authorName}</p>}
                {r.target.excerpt && <p className="mt-1 whitespace-pre-line break-words text-xs text-body">{r.target.excerpt}</p>}
              </div>
              {r.detail && <p className="mt-2 text-xs text-body">Reporter note: {r.detail}</p>}
              {r.resolution && <p className="mt-1 text-2xs text-muted">Resolution note: {r.resolution}</p>}
              {view === "open" && (
                <div className="mt-2 flex flex-wrap items-start gap-1.5">
                  {r.target.exists && r.target.status !== "removed" && r.targetType !== "profile" && (
                    <AdminAction
                      endpoint={`/api/admin/reports/${r.id}`}
                      body={{ resolution: "actioned", removeContent: true }}
                      label="Remove content"
                      icon="x"
                      variant="primary"
                      reasonPrompt="Reason (shown to the author)"
                      reasonField="note"
                    />
                  )}
                  <AdminAction endpoint={`/api/admin/reports/${r.id}`} body={{ resolution: "actioned" }} label="Mark actioned" icon="check" reasonPrompt="What was done? (internal)" reasonField="note" />
                  <AdminAction endpoint={`/api/admin/reports/${r.id}`} body={{ resolution: "dismissed" }} label="Dismiss" variant="ghost" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function RemovedSection() {
  const rows = await listRemovedContent();
  if (rows.length === 0) return <EmptyState icon="shield" title="No removed content" description="Content removed from reports appears here and can be restored." />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={`${r.targetType}-${r.id}`} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="outline">{r.targetType}</Badge>
              {r.removedAt && (
                <span className="text-2xs text-muted">
                  removed <RelativeTime iso={r.removedAt} />
                </span>
              )}
            </div>
            <Link href={r.href} className="mt-1 block text-xs font-semibold text-ink hover:text-accent">
              {r.title}
            </Link>
            <p className="break-words text-xs text-body">{r.excerpt}</p>
            {r.reason && <p className="mt-1 text-2xs text-bad">Reason: {r.reason}</p>}
          </div>
          <AdminAction endpoint="/api/admin/content" body={{ targetType: r.targetType, targetId: r.id, removed: false }} label="Restore" icon="refresh" confirm="Restore this content publicly?" />
        </li>
      ))}
    </ul>
  );
}

async function UsersSection({ viewerId, isAdmin }: { viewerId: string; isAdmin: boolean }) {
  const users = await listUsersForAdmin();
  return (
    <>
      {isAdmin && (
        <div className="border-b border-line p-4">
          <h3 className="mb-2 text-xs font-semibold text-ink">Broadcast announcement</h3>
          <p className="mb-2 text-2xs text-muted">Sends an in-app notification to every active member. Rate-limited to a few per hour — use sparingly.</p>
          <AdminAction
            endpoint="/api/admin/announcements"
            method="POST"
            body={{}}
            label="Send announcement"
            reasonPrompt="Announcement (first line is the title, rest is the message)"
            reasonField="message"
            confirm="Send this announcement to every active member now?"
          />
        </div>
      )}
      <ul className="divide-y divide-line">
      {users.map((u) => {
        const self = u.id === viewerId;
        const endpoint = `/api/admin/users/${u.id}`;
        return (
          <li key={u.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <Avatar initials={u.initials} size="md" verified={u.verifiedPractitioner} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {u.handle ? (
                  <Link href={`/members/${u.handle}`} className="text-sm font-semibold text-ink hover:text-accent">
                    {u.displayName}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-ink">{u.displayName}</span>
                )}
                <Badge tone={STATUS_TONE[u.status] ?? "neutral"}>{u.status}</Badge>
                {!u.emailVerified && <Badge tone="signal">email unverified</Badge>}
                {u.verifiedPractitioner && <Badge tone="accent">verified practitioner</Badge>}
                {u.role !== "member" && <Badge tone="neutral">{u.role}</Badge>}
                {self && <Badge tone="outline">you</Badge>}
              </div>
              <p className="break-all text-2xs text-muted">{u.email}</p>
              <p className="text-2xs text-muted">
                {[u.jobTitle, u.organisationName, u.yearsExperience !== null ? `${u.yearsExperience} yrs` : null].filter(Boolean).join(" · ")} · joined {formatDate(u.createdAt)}
                {u.lastLoginAt && (
                  <>
                    {" "}
                    · last sign-in <RelativeTime iso={u.lastLoginAt} />
                  </>
                )}
              </p>
              {u.suspendedReason && <p className="mt-1 text-2xs text-bad">Suspended: {u.suspendedReason}</p>}
              <p className="mt-1 text-2xs text-muted">Welcome email last sent: {u.welcomeEmailSentAt ? formatDate(u.welcomeEmailSentAt) : "never"}</p>
            </div>
            {!self && (
              <div className="flex flex-wrap items-start gap-1.5">
                {u.verifiedPractitioner ? (
                  <AdminAction endpoint={endpoint} body={{ action: "unverify" }} label="Remove verification" variant="ghost" />
                ) : (
                  <AdminAction endpoint={endpoint} body={{ action: "verify" }} label="Verify practitioner" icon="shieldCheck" />
                )}
                {u.status === "suspended" ? (
                  <AdminAction endpoint={endpoint} body={{ action: "reinstate" }} label="Reinstate" icon="refresh" confirm={`Reinstate ${u.displayName}?`} />
                ) : (
                  u.role !== "admin" && <AdminAction endpoint={endpoint} body={{ action: "suspend" }} label="Suspend" icon="lock" variant="ghost" reasonPrompt="Reason (emailed to the member)" />
                )}
                <AdminAction endpoint={endpoint} body={{ action: "resend-welcome" }} label="Resend welcome email" icon="mail" variant="ghost" confirm={`Resend the welcome email to ${u.displayName}?`} />
                {isAdmin && <RoleSelect userId={u.id} role={u.role} />}
              </div>
            )}
          </li>
        );
      })}
      </ul>
    </>
  );
}

const THREAT_TONE: Record<string, BadgeTone> = { LOW: "good", MEDIUM: "signal", HIGH: "bad", CRITICAL: "bad" };
const SEVERITY_TONE: Record<string, BadgeTone> = { low: "outline", medium: "signal", high: "bad", critical: "bad" };

async function SecuritySection() {
  const [overview, alerts, events] = await Promise.all([getSecurityOverview(), listSecurityAlerts(), listSecurityEvents(50)]);

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-line bg-canvas p-3">
          <p className="text-2xs uppercase tracking-wide text-muted">Current threat level</p>
          <Badge tone={THREAT_TONE[overview.threatLevel]}>{overview.threatLevel}</Badge>
        </div>
        <div className="rounded-md border border-line bg-canvas p-3">
          <p className="text-2xs uppercase tracking-wide text-muted">Events today</p>
          <p className="font-mono text-xl font-semibold text-ink">{overview.eventsToday}</p>
        </div>
        <div className="rounded-md border border-line bg-canvas p-3">
          <p className="text-2xs uppercase tracking-wide text-muted">Auth failures today</p>
          <p className="font-mono text-xl font-semibold text-ink">{overview.authFailuresToday}</p>
        </div>
        <div className="rounded-md border border-line bg-canvas p-3">
          <p className="text-2xs uppercase tracking-wide text-muted">Open alerts</p>
          <p className="font-mono text-xl font-semibold text-ink">{overview.openAlertsCount}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-2xs text-muted">
        <p>Rate-limit events: <span className="font-mono text-ink">{overview.rateLimitEventsToday}</span></p>
        <p>RegBot abuse: <span className="font-mono text-ink">{overview.regbotAbuseToday}</span></p>
        <p>Admin events: <span className="font-mono text-ink">{overview.adminEventsToday}</span></p>
        <p>Critical open: <span className="font-mono text-ink">{overview.criticalOpenCount}</span></p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Member activity (aggregate only)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-canvas p-3">
            <p className="text-2xs uppercase tracking-wide text-muted">Members online</p>
            <p className="font-mono text-xl font-semibold text-ink">{overview.membersOnline}</p>
          </div>
          <div className="rounded-md border border-line bg-canvas p-3">
            <p className="text-2xs uppercase tracking-wide text-muted">Active today</p>
            <p className="font-mono text-xl font-semibold text-ink">{overview.activeToday}</p>
          </div>
          <div className="rounded-md border border-line bg-canvas p-3">
            <p className="text-2xs uppercase tracking-wide text-muted">Active this week</p>
            <p className="font-mono text-xl font-semibold text-ink">{overview.activeThisWeek}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Recent alerts</h3>
        {alerts.length === 0 ? (
          <EmptyState icon="shield" title="No alerts" description="Security alerts appear here, grouped to avoid one notification per occurrence." />
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {alerts.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                  <Badge tone="outline">{a.category}</Badge>
                  <Badge tone="outline">{a.status}</Badge>
                  <span className="text-2xs text-muted">
                    {a.occurrences}× · last seen <RelativeTime iso={a.lastSeenAt} />
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-ink">{a.title}</p>
                <p className="text-xs text-body">{a.summary}</p>
                {(a.status === "open" || a.status === "investigating") && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <AdminAction endpoint="/api/admin/security" body={{ action: "resolve-alert", alertId: a.id }} label="Resolve" icon="check" reasonPrompt="Resolution note" reasonField="note" />
                    <AdminAction endpoint="/api/admin/security" body={{ action: "escalate-alert", alertId: a.id }} label="Escalate" variant="secondary" reasonPrompt="Escalation note" reasonField="note" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Events</h3>
        <div className="relative overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[48rem] text-left text-xs">
            <thead className="bg-canvas/50 text-2xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">When</th>
                <th scope="col" className="px-4 py-2 font-semibold">Type</th>
                <th scope="col" className="px-4 py-2 font-semibold">Severity</th>
                <th scope="col" className="px-4 py-2 font-semibold">Route</th>
                <th scope="col" className="px-4 py-2 font-semibold">Request ID</th>
                <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-muted"><RelativeTime iso={e.createdAt} /></td>
                  <td className="px-4 py-2 font-mono text-2xs">{e.eventType}</td>
                  <td className="px-4 py-2"><Badge tone={SEVERITY_TONE[e.severity]}>{e.severity}</Badge></td>
                  <td className="px-4 py-2 font-mono text-2xs text-muted">{e.route}</td>
                  <td className="px-4 py-2 font-mono text-2xs text-muted">{e.requestId}</td>
                  <td className="px-4 py-2 text-2xs text-muted">{e.status}</td>
                  <td className="px-4 py-2">
                    {e.status === "open" && <AdminAction endpoint="/api/admin/security" body={{ action: "review-event", eventId: e.id }} label="Mark reviewed" variant="ghost" reasonPrompt="Note (optional)" reasonField="note" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Protection controls</h3>
        <ul className="grid gap-2 sm:grid-cols-2 text-xs">
          <li className="rounded-md border border-line bg-canvas px-3 py-2">Application rate limiting — <span className="font-medium text-good">Active</span></li>
          <li className="rounded-md border border-line bg-canvas px-3 py-2">Authentication monitoring — <span className="font-medium text-good">Active</span></li>
          <li className="rounded-md border border-line bg-canvas px-3 py-2">RegBot protection (quotas + rate limits) — <span className="font-medium text-good">Active</span></li>
          <li className="rounded-md border border-line bg-canvas px-3 py-2">Audit logging — <span className="font-medium text-good">Active</span></li>
          <li className="rounded-md border border-line bg-canvas px-3 py-2">Cloudflare WAF — <span className="font-medium text-signal">Requires Cloudflare configuration</span></li>
          <li className="rounded-md border border-line bg-canvas px-3 py-2">Cloudflare edge rate limiting — <span className="font-medium text-signal">Requires Cloudflare configuration</span></li>
          <li className="rounded-md border border-line bg-canvas px-3 py-2">Cloudflare bot protection — <span className="font-medium text-signal">Requires Cloudflare configuration</span></li>
          <li className="rounded-md border border-line bg-canvas px-3 py-2">DDoS protection — <span className="font-medium text-signal">Requires Cloudflare configuration</span></li>
        </ul>
        <p className="mt-2 text-2xs text-muted">See <span className="font-mono">docs/CLOUDFLARE_SETUP.md</span> to configure the edge layer. A control shown here as active is enforced in this application; it is not a substitute for the edge protections above.</p>
      </div>
    </div>
  );
}

async function SuggestionsSection() {
  const rows = await listSuggestionsForAdmin();
  if (rows.length === 0) return <EmptyState icon="flag" title="No suggestions yet" />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((s) => (
        <li key={s.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={s.category === "security" ? "bad" : "outline"}>{s.category}</Badge>
            <Badge tone="outline">{s.priority}</Badge>
            {s.severity && <Badge tone={SEVERITY_TONE[s.severity]}>{s.severity}</Badge>}
            <Badge tone={s.status === "shipped" ? "good" : s.status === "declined" ? "bad" : "outline"}>{s.status === "shipped" ? "completed" : s.status}</Badge>
            <span className="text-2xs text-muted">
              {s.voteCount} votes · by {s.authorName} · <RelativeTime iso={s.createdAt} />
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-ink">{s.title}</p>
          <p className="text-xs text-body">{s.description}</p>
          {s.relatedPage && <p className="mt-1 text-2xs text-muted">Page: {s.relatedPage}</p>}
          {s.ownerId && <p className="mt-1 text-2xs text-muted">Owner: {s.ownerId}</p>}
          {s.adminNotes && <p className="mt-1 text-2xs text-muted">Admin notes: {s.adminNotes}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["under-review", "planned", "in-progress", "shipped", "declined", "duplicate"].map((status) => (
              <AdminAction
                key={status}
                endpoint={`/api/admin/suggestions/${s.id}`}
                method="PATCH"
                body={{ status }}
                label={status === "shipped" ? "completed" : status}
                variant={s.status === status ? "primary" : "ghost"}
              />
            ))}
            <AdminAction endpoint={`/api/admin/suggestions/${s.id}`} method="PATCH" body={{}} label="Add note" reasonPrompt="Admin note" reasonField="adminNotes" />
            <AdminAction endpoint={`/api/admin/suggestions/${s.id}`} method="PATCH" body={{}} label="Assign owner" reasonPrompt="Owner's user ID" reasonField="ownerId" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone?: "bad" | "good" }) {
  return (
    <div className="rounded-md border border-line bg-canvas p-3">
      <p className="text-2xs uppercase tracking-wide text-muted">{label}</p>
      <p className={clsx("font-mono text-xl font-semibold", tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-ink")}>{value}</p>
    </div>
  );
}

async function NewsletterSection({ isAdmin, adminEmail }: { isAdmin: boolean; adminEmail: string }) {
  const [overview, welcomeStats, settings, campaigns, emailConfigured] = await Promise.all([
    getNewsletterAdminOverview(),
    getWelcomeEmailStats(),
    getNewsletterSettings(),
    listNewsletterCampaigns(),
    Promise.resolve(newsletterEmailConfigured()),
  ]);
  const statsByCampaign = new Map(await Promise.all(campaigns.map(async (c) => [c.id, await getCampaignStats(c.id)] as const)));

  return (
    <div className="space-y-6 p-4">
      {!emailConfigured && <Badge tone="signal">SMTP not configured — emails are logged to /dev/mailbox instead of delivered</Badge>}

      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Subscribers</h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Active subscriptions" value={overview.activeSubscribers} tone="good" />
          <StatTile label="Pending confirmations" value={overview.pendingConfirmations} />
          <StatTile label="Unsubscribed" value={overview.unsubscribed} />
          <StatTile label="New this week" value={overview.newThisWeek} tone="good" />
          <StatTile label="Unsubscribes this week" value={overview.unsubscribesThisWeek} tone={overview.unsubscribesThisWeek > 0 ? "bad" : undefined} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Welcome emails</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Sent" value={welcomeStats.sent} />
          <StatTile label="Delivered" value={welcomeStats.delivered} tone="good" />
          <StatTile label="Failed" value={welcomeStats.failed} tone={welcomeStats.failed > 0 ? "bad" : undefined} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Automatic weekly sending</h3>
        <NewsletterSettingsForm settings={settings} isAdmin={isAdmin} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-ink">Campaigns</h3>
          <NewsletterComposer />
        </div>
        {campaigns.length === 0 ? (
          <EmptyState icon="mail" title="No newsletters yet" description="Create a draft to get started." />
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {campaigns.map((c) => (
              <NewsletterCampaignRow key={c.id} campaign={c} stats={statsByCampaign.get(c.id)!} adminEmail={adminEmail} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

async function AuditSection() {
  const rows = await listAuditLog();
  if (rows.length === 0) return <EmptyState icon="layers" title="No staff actions yet" />;
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-xs">
        <thead className="bg-canvas/50 text-2xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">When</th>
            <th scope="col" className="px-4 py-2 font-semibold">Who</th>
            <th scope="col" className="px-4 py-2 font-semibold">Action</th>
            <th scope="col" className="px-4 py-2 font-semibold">Target</th>
            <th scope="col" className="px-4 py-2 font-semibold">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-2 text-muted"><RelativeTime iso={r.createdAt} /></td>
              <td className="px-4 py-2 text-ink">{r.actorName}</td>
              <td className="px-4 py-2 font-mono text-2xs">{r.action}</td>
              <td className="px-4 py-2 font-mono text-2xs text-muted">{r.targetType}:{r.targetId.slice(0, 12)}</td>
              <td className="px-4 py-2 text-body">{r.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePageSession("/admin");
  const isAdmin = session.user.role === "admin";
  if (!isStaff(session.user)) {
    return (
      <div className="mx-auto max-w-xl rounded-md border border-line bg-surface">
        <EmptyState icon="shield" title="Admin access required" description="Your account does not have permission to view this page." />
      </div>
    );
  }

  const overview = (await getAdminOverview()).filter((s) => isAdmin || s.staff);
  const requested = firstParam(searchParams, "section") as AdminSection | undefined;
  const active = overview.find((s) => s.id === requested) ?? overview[0];
  const queue = QUEUES.find((q) => q.id === firstParam(searchParams, "queue"))?.id ?? "pending-review";
  const reportView = firstParam(searchParams, "view") === "resolved" ? "resolved" : "open";

  let content: React.ReactNode;
  switch (active.id) {
    case "updates":
      content = <UpdatesSection queue={queue} isAdmin={isAdmin} />;
      break;
    case "sources":
      content = <SourcesSection />;
      break;
    case "reports":
      content = <ReportsSection view={reportView} />;
      break;
    case "moderation":
      content = <RemovedSection />;
      break;
    case "users":
      content = <UsersSection viewerId={session.user.id} isAdmin={isAdmin} />;
      break;
    case "security":
      content = <SecuritySection />;
      break;
    case "audit":
      content = <AuditSection />;
      break;
    case "suggestions":
      content = <SuggestionsSection />;
      break;
    case "newsletter":
      content = <NewsletterSection isAdmin={isAdmin} adminEmail={session.user.email} />;
      break;
    default:
      content = <EmptyState icon="settings" title="Management tools coming soon" description={active.description} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Admin"
        description="Review regulatory updates before publication, moderate community content, and manage members and sources. Every action is recorded in the audit log."
        meta={<Badge tone="accent">{isAdmin ? "Admin" : "Moderator"}</Badge>}
      />

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {overview.map((s) => (
          <li key={s.id}>
            <Link
              href={`/admin?section=${s.id}`}
              aria-current={active.id === s.id ? "page" : undefined}
              className={clsx("flex h-full flex-col rounded-md border bg-surface p-3", active.id === s.id ? "border-accent ring-1 ring-accent" : "border-line hover:border-muted/40")}
            >
              <span className="text-xs font-semibold text-ink">{s.label}</span>
              <span className="mt-1 font-mono text-xl font-semibold text-ink">{s.total}</span>
              <span className={clsx("text-2xs", s.needsAttention > 0 ? "text-signal" : "text-muted")}>{s.attentionLabel ? `${s.needsAttention} ${s.attentionLabel}` : " "}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Panel title={active.label} eyebrow={active.description} className="mt-6" bodyClassName="p-0">
        {content}
      </Panel>
    </>
  );
}
