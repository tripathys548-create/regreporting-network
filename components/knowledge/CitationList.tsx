import { getSourceSync } from "@/lib/repositories/sources";
import { formatDate } from "@/lib/format";
import type { Citation, SourceDocument } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { DemoContentLabel, SourceBadge, SourceTypeLabel } from "@/components/ui/SourceLabels";

export function CitationList({ citations, documents }: { citations: Citation[]; documents: Map<string, SourceDocument> }) {
  const resolved = citations.flatMap((c) => {
    const doc = documents.get(c.sourceDocumentId);
    return doc ? [{ citation: c, doc, source: getSourceSync(doc.sourceId) }] : [];
  });
  if (resolved.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1.5 border-l-2 border-line pl-3" aria-label="Citations">
      {resolved.map(({ citation, doc, source }, i) => (
        <li key={`${doc.id}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <SourceBadge name={source.shortName} tier={source.tier} />
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-strong">
            {doc.title}
            <Icon name="external" className="h-3 w-3" />
          </a>
          {citation.locator && <span className="font-mono text-2xs text-muted">{citation.locator}</span>}
          <span className="text-2xs text-muted">{formatDate(doc.publishedAt)}</span>
          <SourceTypeLabel type={doc.sourceType} size="xs" />
          {doc.isDemo && <DemoContentLabel compact />}
        </li>
      ))}
    </ul>
  );
}
