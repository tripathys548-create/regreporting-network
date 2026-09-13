import type { SourceType, TopicSlug } from "@/types";

/**
 * Fixed demo corpus standing in for the trusted-source index.
 * Passage text is written for the demo and is NOT quoted from the cited documents.
 * In Phase 4 this is replaced by retrieval over ingested, verified documents.
 */
export interface CorpusPassage {
  id: string;
  sourceDocumentId: string;
  sourceType: SourceType;
  locator: string;
  topics: TopicSlug[];
  keywords: string[];
  text: string;
}

export const CORPUS: CorpusPassage[] = [
  {
    id: "p-uti-lifecycle-req",
    sourceDocumentId: "doc-emir-guidelines",
    sourceType: "regulatory-requirement",
    locator: "Section on lifecycle events (demo reference)",
    topics: ["emir", "uti"],
    keywords: ["uti", "lifecycle", "modification", "event", "missing", "modi", "pairing"],
    text: "Lifecycle event reports are expected to reference the existing transaction using the same UTI that was originally reported, except for events that result in a new transaction.",
  },
  {
    id: "p-uti-validation",
    sourceDocumentId: "doc-emir-validation",
    sourceType: "regulatory-requirement",
    locator: "UTI field validation (demo reference)",
    topics: ["emir", "uti", "trade-repository"],
    keywords: ["uti", "missing", "reject", "rejection", "validation", "mandatory", "blank", "late", "provisional"],
    text: "Validation rules treat the UTI as a mandatory field for reports on existing transactions; a submission without it cannot be linked to the trade and is expected to be rejected.",
  },
  {
    id: "p-uti-cpmi",
    sourceDocumentId: "doc-cpmi-uti",
    sourceType: "industry-guidance",
    locator: "UTI generation and structure (demo reference)",
    topics: ["uti"],
    keywords: ["uti", "generate", "generation", "structure", "length", "share", "sharing"],
    text: "Harmonisation guidance describes who should generate the UTI, its structure, and the expectation that it is communicated to the other counterparty in a timely manner.",
  },
  {
    id: "p-uti-isda",
    sourceDocumentId: "doc-isda-uti-bp",
    sourceType: "industry-guidance",
    locator: "Agreeing the generating party (demo reference)",
    topics: ["uti", "operations"],
    keywords: ["uti", "novation", "lifecycle", "pairing", "counterparty", "agree", "break"],
    text: "Industry practice encourages counterparties to agree bilaterally which party generates the UTI, including after events such as novation, to reduce pairing breaks.",
  },
  {
    id: "p-uti-dtcc",
    sourceDocumentId: "doc-dtcc-gtr-spec",
    sourceType: "implementation-reference",
    locator: "Rejection feedback for missing identifiers (demo reference)",
    topics: ["dtcc", "trade-repository", "uti"],
    keywords: ["uti", "missing", "reject", "rejection", "feedback", "status", "message"],
    text: "The trade repository returns a rejection status with an error code identifying the failed rule, which can be used to route the exception to the correct remediation queue.",
  },
  {
    id: "p-uti-timing-conflict",
    sourceDocumentId: "doc-isda-uti-bp",
    sourceType: "industry-guidance",
    locator: "UTI sharing timelines (demo reference)",
    topics: ["uti"],
    keywords: ["uti", "timing", "late", "deadline", "share"],
    text: "Some industry practice notes suggest a firm may report with a provisional identifier if the UTI has not been received before the deadline, which may not align with regulator expectations in every regime.",
  },
  {
    id: "p-action-types",
    sourceDocumentId: "doc-emir-guidelines",
    sourceType: "regulatory-requirement",
    locator: "Action types (demo reference)",
    topics: ["emir", "operations"],
    keywords: ["action", "type", "correction", "corr", "modi", "eror", "error", "term", "newt", "correct"],
    text: "Action types distinguish between genuine changes to a trade (modification), corrections of erroneously reported data (correction), and cancellation of reports that should never have been made (error).",
  },
  {
    id: "p-late-reporting",
    sourceDocumentId: "doc-emir-reg",
    sourceType: "regulatory-requirement",
    locator: "Reporting deadline (demo reference)",
    topics: ["emir", "operations"],
    keywords: ["late", "deadline", "timely", "timeliness", "backfill", "delay", "reporting"],
    text: "Reports are required within the deadline set by the regulation. Late submissions still need to be made, and firms should assess whether the breach requires notification to the competent authority.",
  },
  {
    id: "p-delegated",
    sourceDocumentId: "doc-emir-reg",
    sourceType: "regulatory-requirement",
    locator: "Delegation of reporting (demo reference)",
    topics: ["emir", "data-quality"],
    keywords: ["delegated", "delegation", "delegate", "third", "party", "client", "oversight"],
    text: "Counterparties may delegate the submission of reports, but the framework sets out conditions on where responsibility remains, so firms typically keep oversight controls over delegated reports.",
  },
  {
    id: "p-lei-status",
    sourceDocumentId: "doc-gleif-lei",
    sourceType: "implementation-reference",
    locator: "LEI registration status (demo reference)",
    topics: ["lei"],
    keywords: ["lei", "lapsed", "renewal", "status", "registration", "entity", "identifier"],
    text: "Each LEI record carries a registration status. A lapsed status indicates the reference data has not been renewed within the required period.",
  },
  {
    id: "p-upi",
    sourceDocumentId: "doc-dsb-upi",
    sourceType: "implementation-reference",
    locator: "UPI templates (demo reference)",
    topics: ["upi"],
    keywords: ["upi", "product", "template", "identifier", "bespoke", "exotic"],
    text: "UPIs are created from product templates using defined attributes per asset class. Products that do not fit an existing template may require a request to the service provider.",
  },
  {
    id: "p-iso20022",
    sourceDocumentId: "doc-emir-rts",
    sourceType: "regulatory-requirement",
    locator: "Reporting format (demo reference)",
    topics: ["emir", "iso-20022"],
    keywords: ["iso", "20022", "xml", "format", "schema", "message"],
    text: "Reports are submitted using a common electronic format based on ISO 20022 XML templates.",
  },
  {
    id: "p-recon",
    sourceDocumentId: "doc-emir-validation",
    sourceType: "regulatory-requirement",
    locator: "Reconciliation tolerances (demo reference)",
    topics: ["emir", "data-quality", "trade-repository"],
    keywords: ["reconciliation", "recon", "tolerance", "pairing", "matching", "break", "unpaired"],
    text: "Reconciliation compares paired reports field by field, with published tolerances for specified fields. Reports that cannot be paired are not field-matched.",
  },
  {
    id: "p-cftc-errors",
    sourceDocumentId: "doc-cftc-part45",
    sourceType: "regulatory-requirement",
    locator: "Correction of errors (demo reference)",
    topics: ["cftc", "data-quality"],
    keywords: ["cftc", "error", "correction", "swap", "sdr", "part", "45"],
    text: "Reporting counterparties are expected to correct errors and omissions in swap data previously reported and to follow the notification requirements where corrections cannot be made in time.",
  },
];
