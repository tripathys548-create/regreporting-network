import { DOCUMENTS } from "@/data/documents";
import { RADAR_SOURCE_IDS, SOURCES } from "@/data/sources";
import type { RegulatorySource, SourceDocument } from "@/types";

/*
 * Repository modules are the only code that touches /data.
 * Phase 3 swaps these implementations for database queries; callers stay unchanged.
 */

export async function listSources(): Promise<RegulatorySource[]> {
  return [...SOURCES].sort((a, b) => a.tier - b.tier);
}

export async function getSource(id: string): Promise<RegulatorySource | null> {
  return SOURCES.find((s) => s.id === id) ?? null;
}

export async function listRadarSources(): Promise<RegulatorySource[]> {
  return RADAR_SOURCE_IDS.map((id) => SOURCES.find((s) => s.id === id)).filter((s): s is RegulatorySource => Boolean(s));
}

export function getSourceSync(id: string): RegulatorySource {
  const source = SOURCES.find((s) => s.id === id);
  if (!source) throw new Error(`Unknown source: ${id}`);
  return source;
}

export async function getDocument(id: string): Promise<SourceDocument | null> {
  return DOCUMENTS.find((d) => d.id === id) ?? null;
}

export async function getDocuments(ids: string[]): Promise<SourceDocument[]> {
  const unique = Array.from(new Set(ids));
  return unique.map((id) => DOCUMENTS.find((d) => d.id === id)).filter((d): d is SourceDocument => Boolean(d));
}

export async function listDocuments(): Promise<SourceDocument[]> {
  return DOCUMENTS;
}
