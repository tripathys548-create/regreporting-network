import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminAction } from "@/components/admin/AdminAction";
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
  listAuditLog,
  listFeedsAndRuns,
  listRemovedContent,
  listReportsForModeration,
  listUpdatesForReview,
  listUsersForAdmin,
  type AdminSection,
  type UpdateQueue,
} from "@/lib/repositories/admin";

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
                {isAdmin && <RoleSelect userId={u.id} role={u.role} />}
              </div>
            )}
          </li>
        );
      })}
    </ul>
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
    case "audit":
      content = <AuditSection />;
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
