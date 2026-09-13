import type { SourceType, TopicSlug } from "@/types";

/*
 * RegBot reference library: prewritten answers that follow the RegBot
 * specification (lib/regbot/systemPrompt.ts). One-sentence definitions, no field
 * counts, regulation vs industry guidance kept apart. Answers are free to serve —
 * no model call. Terms are lowercase, punctuation-free and matched as whole words.
 */

export interface LibrarySource {
  authority: string;
  title: string;
  category: SourceType;
}

export interface LibraryEntry {
  id: string;
  label: string;
  terms: string[];
  topics: TopicSlug[];
  /** "X is …" — exactly one sentence. */
  definition: string;
  /** "X is primarily regulated by …" */
  regulator?: string;
  /** "X matters because …" */
  why?: string;
  /** What is reported, in compact categories. */
  reports?: string;
  sources: LibrarySource[];
  /** Adds the version/date caveat for requirements that change over time. */
  dateSensitive?: boolean;
}

export const VERSION_CAVEAT = "Requirements may vary by the current technical specification/version.";

export const GENERIC_REPORTS =
  "Typically, firms report counterparty, transaction, product, lifecycle, valuation/collateral and identifier data, subject to the specific regime and reporting specification.";

export const REPORTING_FLOW = `Regulatory reporting generally follows this lifecycle, with the exact steps depending on the regime and the firm's architecture:
- Trade booked
- Trade enriched with reference and counterparty data
- Regulatory rules applied (is it reportable, who reports, which regime)
- Data mapped to the reporting specification
- Validation against schema and business rules
- Submission to the trade repository or regulator
- Acknowledgement received
- Accepted or rejected
- Exception handling for rejections and breaks
- Correction and resubmission
- Reconciliation and pairing
- Ongoing monitoring and controls`;

const req = (authority: string, title: string): LibrarySource => ({ authority, title, category: "regulatory-requirement" });
const guide = (authority: string, title: string): LibrarySource => ({ authority, title, category: "industry-guidance" });
const impl = (authority: string, title: string): LibrarySource => ({ authority, title, category: "implementation-reference" });

export const ENTRIES: LibraryEntry[] = [
  // ── AML / KYC / financial crime ─────────────────────────────────────────────
  {
    id: "aml",
    label: "AML",
    terms: ["aml", "anti money laundering", "money laundering"],
    topics: ["regulatory-change"],
    definition: "AML (Anti-Money Laundering) is the framework of laws, controls and processes used by financial institutions to detect and prevent money laundering and related financial crime.",
    regulator: "AML requirements are set nationally in line with the FATF Recommendations and supervised by national authorities, such as FinCEN in the US, the FCA and other supervisors in the UK, national supervisors and the new AMLA in the EU, and FIU-IND in India.",
    why: "AML matters because it stops the financial system being used to launder criminal proceeds or finance terrorism, and failures lead to regulatory action, fines and reputational damage.",
    reports: "AML reporting is event-driven rather than trade-by-trade: firms file suspicious activity or transaction reports when suspicion arises, and some jurisdictions also require threshold-based reports such as cash transaction reports.",
    sources: [guide("FATF", "The FATF Recommendations"), req("FinCEN", "Bank Secrecy Act regulations")],
  },
  {
    id: "kyc",
    label: "KYC",
    terms: ["kyc", "know your customer", "know your client"],
    topics: ["operations"],
    definition: "KYC (Know Your Customer) is the process of verifying a customer's identity and understanding who they are before and during a business relationship, forming part of a firm's customer due diligence obligations under AML rules.",
    sources: [guide("FATF", "The FATF Recommendations — customer due diligence")],
  },
  {
    id: "cdd",
    label: "CDD",
    terms: ["cdd", "customer due diligence"],
    topics: ["operations"],
    definition: "CDD (Customer Due Diligence) is the set of AML checks a firm performs to identify and verify a customer and any beneficial owners, understand the purpose of the relationship and monitor it on an ongoing basis.",
    sources: [guide("FATF", "The FATF Recommendations — customer due diligence")],
  },
  {
    id: "edd",
    label: "EDD",
    terms: ["edd", "enhanced due diligence"],
    topics: ["operations"],
    definition: "EDD (Enhanced Due Diligence) is the additional, more intensive due diligence required for higher-risk customers or situations, such as politically exposed persons or relationships linked to high-risk jurisdictions.",
    sources: [guide("FATF", "The FATF Recommendations — higher-risk situations")],
  },
  {
    id: "transaction-monitoring",
    label: "Transaction monitoring",
    terms: ["transaction monitoring"],
    topics: ["operations", "data-quality"],
    definition: "Transaction monitoring is the ongoing review of customer transactions, usually through automated rules or models, to detect activity that may indicate money laundering, terrorist financing or other financial crime.",
    sources: [guide("FATF", "The FATF Recommendations — ongoing monitoring")],
  },
  {
    id: "sanctions",
    label: "Sanctions screening",
    terms: ["sanctions", "sanctions screening", "sanction screening"],
    topics: ["operations"],
    definition: "Sanctions screening is the control that checks customers, counterparties and payments against sanctions lists, such as those issued by the UN, the US, the EU and the UK, to prevent dealings with sanctioned persons, entities or jurisdictions.",
    sources: [],
  },
  {
    id: "beneficial-ownership",
    label: "Beneficial ownership",
    terms: ["beneficial ownership", "beneficial owner", "beneficial owners", "ubo"],
    topics: ["operations"],
    definition: "Beneficial ownership identifies the natural persons who ultimately own or control a legal entity, which firms must establish as part of customer due diligence.",
    sources: [guide("FATF", "The FATF Recommendations — transparency and beneficial ownership")],
  },
  {
    id: "sar",
    label: "Suspicious activity reporting",
    terms: ["sar", "sars", "str", "strs", "suspicious activity report", "suspicious activity reporting", "suspicious transaction report", "suspicious transaction reporting"],
    topics: ["operations"],
    definition: "A SAR (Suspicious Activity Report) or STR (Suspicious Transaction Report) is a confidential report a firm files with its national financial intelligence unit when it knows or suspects that activity may involve money laundering or terrorist financing.",
    reports: "A suspicious activity report typically describes the subject, the accounts and transactions involved, and why the activity is suspicious, using the form and technical format set by the relevant financial intelligence unit.",
    sources: [guide("FATF", "The FATF Recommendations — reporting of suspicious transactions")],
  },
  {
    id: "fatf",
    label: "FATF",
    terms: ["fatf", "financial action task force"],
    topics: ["regulatory-change"],
    definition: "FATF (Financial Action Task Force) is the intergovernmental standard setter whose Recommendations define the global framework for combating money laundering, terrorist financing and proliferation financing.",
    sources: [guide("FATF", "The FATF Recommendations")],
  },
  {
    id: "fincen",
    label: "FinCEN",
    terms: ["fincen", "financial crimes enforcement network"],
    topics: ["regulatory-change"],
    definition: "FinCEN (Financial Crimes Enforcement Network) is the US Treasury bureau that administers the Bank Secrecy Act and receives reports such as Suspicious Activity Reports and Currency Transaction Reports.",
    sources: [req("FinCEN", "Bank Secrecy Act regulations")],
  },
  {
    id: "pmla",
    label: "India PMLA / FIU-IND",
    terms: ["pmla", "prevention of money laundering act", "fiu ind", "fiu india"],
    topics: ["regulatory-change"],
    definition: "India's PMLA (Prevention of Money-Laundering Act, 2002) sets AML obligations for reporting entities, which file reports such as suspicious transaction reports with FIU-IND, India's financial intelligence unit.",
    sources: [req("FIU-IND", "Prevention of Money-Laundering Act, 2002 and rules")],
    dateSensitive: true,
  },
  {
    id: "eu-aml",
    label: "EU AML framework",
    terms: ["eu aml", "eu aml framework", "amla", "amlr", "amld", "anti money laundering directive"],
    topics: ["regulatory-change"],
    definition: "The EU AML framework is built on successive Anti-Money Laundering Directives, and the 2024 AML package adds a directly applicable AML Regulation and a new EU Anti-Money Laundering Authority (AMLA), with obligations applying in phases.",
    sources: [req("European Commission", "EU anti-money laundering legislative package")],
    dateSensitive: true,
  },
  {
    id: "uk-aml",
    label: "UK AML framework",
    terms: ["uk aml", "uk aml framework", "money laundering regulations", "mlrs", "poca", "proceeds of crime act"],
    topics: ["regulatory-change"],
    definition: "The UK AML framework is centred on the Money Laundering Regulations 2017 and the Proceeds of Crime Act 2002, with the FCA supervising many financial firms and suspicious activity reports going to the National Crime Agency's UK Financial Intelligence Unit.",
    sources: [req("FCA", "Money Laundering Regulations 2017 supervision")],
    dateSensitive: true,
  },

  // ── Regulators ──────────────────────────────────────────────────────────────
  {
    id: "cftc",
    label: "CFTC",
    terms: ["cftc", "commodity futures trading commission"],
    topics: ["cftc"],
    definition: "The CFTC (Commodity Futures Trading Commission) is the US regulator responsible for overseeing derivatives markets including futures, options and swaps.",
    why: "CFTC reporting matters because swap data reported to swap data repositories gives the CFTC oversight of US swaps markets and supports real-time public price transparency.",
    reports: "Under CFTC Part 45, reporting counterparties report creation data, continuation data (lifecycle and state changes), valuation data and, where applicable, margin and collateral data to a swap data repository, identified by UTI, UPI and LEI.",
    sources: [req("CFTC", "17 CFR Part 43 — Real-Time Public Reporting"), req("CFTC", "17 CFR Part 45 — Swap Data Recordkeeping and Reporting Requirements")],
    dateSensitive: true,
  },
  {
    id: "sec",
    label: "SEC",
    terms: ["sec", "securities and exchange commission"],
    topics: ["sec"],
    definition: "The SEC (Securities and Exchange Commission) is the US securities markets regulator, and under Regulation SBSR it requires security-based swaps to be reported to registered security-based swap data repositories.",
    sources: [req("SEC", "Regulation SBSR — Reporting and Dissemination of Security-Based Swap Information")],
    dateSensitive: true,
  },
  {
    id: "esma",
    label: "ESMA",
    terms: ["esma", "european securities and markets authority"],
    topics: ["emir", "sftr", "mifir"],
    definition: "ESMA (European Securities and Markets Authority) is the EU securities markets authority that develops technical standards and guidance for regimes such as EMIR, SFTR and MiFIR and directly supervises EU trade repositories.",
    sources: [req("ESMA", "ESMA technical standards and guidelines")],
  },
  {
    id: "fca",
    label: "FCA",
    terms: ["fca", "financial conduct authority"],
    topics: ["uk-emir"],
    definition: "The FCA (Financial Conduct Authority) is the UK conduct regulator responsible for regimes including UK EMIR, UK MiFIR transaction reporting and UK SFTR, and for supervising many firms' AML controls.",
    sources: [req("FCA", "FCA Handbook and UK EMIR reporting requirements")],
  },
  {
    id: "mas",
    label: "MAS",
    terms: ["mas", "monetary authority of singapore"],
    topics: ["regulatory-change"],
    definition: "MAS is Singapore's central bank and financial regulator, responsible for supervising Singapore's financial system and implementing relevant regulatory reporting requirements.",
    regulator: "Singapore OTC derivatives reporting is primarily regulated by MAS, which sets reporting obligations under the Securities and Futures Act framework for in-scope entities and derivatives contracts.",
    reports: "Under MAS OTC derivatives reporting, in-scope entities report specified derivatives contracts to a licensed or recognised trade repository, including transaction, counterparty, product and lifecycle data as set out in the applicable MAS regulations and technical specifications.",
    sources: [req("MAS", "Securities and Futures (Reporting of Derivatives Contracts) Regulations")],
    dateSensitive: true,
  },
  {
    id: "asic",
    label: "ASIC",
    terms: ["asic", "australian securities and investments commission"],
    topics: ["regulatory-change"],
    definition: "ASIC (Australian Securities and Investments Commission) is Australia's corporate, markets and financial services regulator, which administers OTC derivative transaction reporting under the ASIC Derivative Transaction Rules (Reporting).",
    sources: [req("ASIC", "ASIC Derivative Transaction Rules (Reporting)")],
    dateSensitive: true,
  },
  {
    id: "hong-kong",
    label: "HKMA and SFC",
    terms: ["hkma", "hong kong monetary authority", "sfc", "securities and futures commission", "hktr"],
    topics: ["regulatory-change"],
    definition: "In Hong Kong, the HKMA (the central banking institution and banking regulator) operates the OTC derivatives trade repository and the SFC regulates securities and futures markets, with both overseeing the OTC derivatives reporting regime.",
    sources: [req("HKMA", "Hong Kong OTC derivatives reporting regime"), req("SFC", "Hong Kong OTC derivatives regime")],
    dateSensitive: true,
  },
  {
    id: "jfsa",
    label: "JFSA",
    terms: ["jfsa", "fsa japan", "japan fsa", "japanese financial services agency"],
    topics: ["regulatory-change"],
    definition: "The JFSA (Financial Services Agency) is Japan's financial regulator, which requires reporting of OTC derivatives transactions under the Financial Instruments and Exchange Act framework.",
    sources: [req("JFSA", "Financial Instruments and Exchange Act — OTC derivatives reporting")],
    dateSensitive: true,
  },
  {
    id: "finma",
    label: "FINMA",
    terms: ["finma", "swiss financial market supervisory authority", "finmia", "finfrag"],
    topics: ["regulatory-change"],
    definition: "FINMA is Switzerland's financial market supervisory authority, and derivatives transaction reporting to an authorised or recognised trade repository is required under the Financial Market Infrastructure Act (FinMIA).",
    sources: [req("FINMA", "Financial Market Infrastructure Act (FinMIA)")],
    dateSensitive: true,
  },
  {
    id: "bis",
    label: "BIS",
    terms: ["bis", "bank for international settlements"],
    topics: ["regulatory-change"],
    definition: "The BIS (Bank for International Settlements) is the international organisation for central banks that hosts committees such as the CPMI, which with IOSCO publishes global guidance on derivatives data harmonisation.",
    sources: [guide("BIS", "CPMI-IOSCO harmonisation guidance")],
  },

  // ── CFTC / SEC regimes ──────────────────────────────────────────────────────
  {
    id: "part-43",
    label: "CFTC Part 43",
    terms: ["part 43", "cftc part 43", "real time public reporting", "real time reporting", "public dissemination"],
    topics: ["cftc"],
    definition: "CFTC Part 43 sets the real-time public reporting rules under which swap transaction and pricing data is publicly disseminated through swap data repositories as soon as technologically practicable, without identifying the counterparties.",
    sources: [req("CFTC", "17 CFR Part 43 — Real-Time Public Reporting")],
    dateSensitive: true,
  },
  {
    id: "part-45",
    label: "CFTC Part 45",
    terms: ["part 45", "cftc part 45", "swap data reporting", "swap reporting"],
    topics: ["cftc"],
    definition: "CFTC Part 45 sets the swap data recordkeeping and regulatory reporting rules, requiring creation, continuation, valuation and margin/collateral data for swaps to be reported to a registered swap data repository for use by regulators.",
    reports: "Under CFTC Part 45, reporting counterparties report creation data, continuation data (lifecycle and state changes), valuation data and, where applicable, margin and collateral data to a swap data repository, identified by UTI, UPI and LEI.",
    sources: [req("CFTC", "17 CFR Part 45 — Swap Data Recordkeeping and Reporting Requirements")],
    dateSensitive: true,
  },
  {
    id: "sdr",
    label: "Swap Data Repository",
    terms: ["sdr", "sdrs", "swap data repository", "swap data repositories"],
    topics: ["cftc", "trade-repository"],
    definition: "A Swap Data Repository (SDR) is a CFTC-registered entity that collects and maintains swap data reported under CFTC rules, publicly disseminates Part 43 data and gives regulators access to Part 45 data.",
    sources: [req("CFTC", "17 CFR Part 49 — Swap Data Repositories")],
  },
  {
    id: "continuation-data",
    label: "Continuation data",
    terms: ["continuation data"],
    topics: ["cftc"],
    definition: "Under CFTC Part 45, continuation data covers the lifecycle events and state changes of a swap after its creation, together with the valuation and, where applicable, margin and collateral data reported over the swap's life.",
    sources: [req("CFTC", "17 CFR Part 45 — Swap Data Recordkeeping and Reporting Requirements")],
    dateSensitive: true,
  },
  {
    id: "sbsr",
    label: "Regulation SBSR",
    terms: ["sbsr", "regulation sbsr", "security based swap", "security based swaps", "sbsdr", "sbsdrs", "security based swap data repository"],
    topics: ["sec"],
    definition: "Regulation SBSR is the SEC rule set requiring security-based swaps, such as single-name credit default swaps, to be reported to registered security-based swap data repositories for regulatory reporting and public dissemination.",
    sources: [req("SEC", "Regulation SBSR — Reporting and Dissemination of Security-Based Swap Information")],
    dateSensitive: true,
  },

  // ── EU / UK regimes ─────────────────────────────────────────────────────────
  {
    id: "emir",
    label: "EMIR",
    terms: ["emir", "eu emir", "european market infrastructure regulation"],
    topics: ["emir"],
    definition: "EMIR is the EU regulatory framework for OTC derivatives, central counterparties and trade repositories, with transaction-reporting requirements designed to improve market transparency and reduce systemic risk.",
    regulator: "EMIR is primarily regulated by ESMA and EU national competent authorities, which oversee derivatives reporting, clearing and risk mitigation in the EU.",
    why: "EMIR matters because derivatives reporting to trade repositories lets EU authorities monitor exposures and systemic risk, and reporting errors are a common supervisory focus.",
    reports: "Under EMIR, both counterparties (subject to delegation and exemptions) report counterparty data, common transaction data, product and identifier data (UTI, UPI, LEI), lifecycle events, valuation and margin/collateral data to an ESMA-registered trade repository.",
    sources: [req("ESMA", "Regulation (EU) No 648/2012 (EMIR) and reporting technical standards")],
    dateSensitive: true,
  },
  {
    id: "emir-refit",
    label: "EMIR Refit",
    terms: ["emir refit", "refit", "emir reporting refit"],
    topics: ["emir", "iso-20022"],
    definition: "EMIR Refit is the amended EMIR reporting framework that expanded and harmonised the reportable data, aligned it with global CPMI-IOSCO data elements including UTI and UPI, and mandated ISO 20022 XML reporting, going live in the EU on 29 April 2024 and under UK EMIR on 30 September 2024.",
    sources: [req("ESMA", "EMIR Refit reporting technical standards and validation rules"), req("FCA", "UK EMIR reporting requirements")],
    dateSensitive: true,
  },
  {
    id: "uk-emir",
    label: "UK EMIR",
    terms: ["uk emir", "onshored emir"],
    topics: ["uk-emir"],
    definition: "UK EMIR is the onshored version of EMIR that applies in the UK after Brexit, supervised by the FCA with the Bank of England for central counterparties, with its own reporting requirements and FCA-registered trade repositories.",
    regulator: "UK EMIR reporting is primarily regulated by the FCA, which oversees derivatives reporting by UK counterparties and registers UK trade repositories.",
    sources: [req("FCA", "UK EMIR reporting requirements")],
    dateSensitive: true,
  },
  {
    id: "sftr",
    label: "SFTR",
    terms: ["sftr", "securities financing transactions regulation", "securities financing transaction regulation", "sft reporting"],
    topics: ["sftr"],
    definition: "SFTR is the EU regulation requiring reporting of securities financing transactions to improve transparency around repo, securities lending and similar activities.",
    regulator: "SFTR is primarily regulated by ESMA and EU national competent authorities, with the FCA overseeing the UK version of SFTR.",
    why: "SFTR matters because securities financing can build hidden leverage and liquidity risk, so reporting gives authorities visibility of repo, securities lending, buy-sell backs and margin lending.",
    reports: "Under SFTR, counterparties report counterparty, loan, collateral, margin and reuse data for repos, securities lending, buy-sell and sell-buy backs and margin lending to a registered trade repository, identified by UTI and LEI.",
    sources: [req("ESMA", "Regulation (EU) 2015/2365 (SFTR) and reporting technical standards")],
    dateSensitive: true,
  },
  {
    id: "mifid",
    label: "MiFID II",
    terms: ["mifid", "mifid ii", "mifid 2", "markets in financial instruments directive"],
    topics: ["mifir"],
    definition: "MiFID II is the EU directive governing investment firms and trading venues, covering authorisation, conduct of business, investor protection and market structure, and it works alongside MiFIR.",
    sources: [req("ESMA", "Directive 2014/65/EU (MiFID II)")],
  },
  {
    id: "mifir",
    label: "MiFIR",
    terms: ["mifir", "markets in financial instruments regulation"],
    topics: ["mifir"],
    definition: "MiFIR is the directly applicable EU regulation accompanying MiFID II that sets transaction reporting to national competent authorities, pre- and post-trade transparency and instrument reference data requirements.",
    reports: "Under MiFIR transaction reporting, investment firms report executed transactions to their competent authority (often via an ARM), including instrument, price, quantity, venue, timestamps, buyer and seller, and decision-maker and trader identifiers.",
    sources: [req("ESMA", "Regulation (EU) No 600/2014 (MiFIR) and transaction reporting guidelines")],
    dateSensitive: true,
  },
  {
    id: "transaction-reporting",
    label: "Transaction reporting",
    terms: ["transaction reporting", "trade reporting", "regulatory transaction reporting"],
    topics: ["operations"],
    definition: "Regulatory transaction reporting is the obligation to report details of in-scope trades to a regulator or trade repository within set deadlines so that authorities can monitor markets, systemic risk and market abuse.",
    sources: [],
  },
  {
    id: "transparency-reporting",
    label: "Transparency reporting",
    terms: ["transparency reporting", "post trade transparency", "pre trade transparency"],
    topics: ["mifir"],
    definition: "Transparency reporting is the publication of pre- and post-trade price and volume information to the market under MiFID II/MiFIR, typically through trading venues and Approved Publication Arrangements.",
    sources: [req("ESMA", "MiFIR transparency requirements")],
  },
  {
    id: "apa",
    label: "APA",
    terms: ["apa", "approved publication arrangement"],
    topics: ["mifir"],
    definition: "An APA (Approved Publication Arrangement) is an authorised service that publishes post-trade transparency reports on behalf of investment firms under MiFID II/MiFIR.",
    sources: [req("ESMA", "MiFID II data reporting services")],
  },
  {
    id: "arm",
    label: "ARM",
    terms: ["arm", "approved reporting mechanism"],
    topics: ["mifir"],
    definition: "An ARM (Approved Reporting Mechanism) is an authorised service that submits MiFIR transaction reports to competent authorities on behalf of investment firms.",
    sources: [req("ESMA", "MiFID II data reporting services")],
  },
  {
    id: "si",
    label: "Systematic Internaliser",
    terms: ["systematic internaliser", "systematic internalizer", "systematic internalisers"],
    topics: ["mifir"],
    definition: "A Systematic Internaliser (SI) is an investment firm that deals on its own account by executing client orders outside a trading venue on an organised, frequent, systematic and substantial basis, which triggers specific MiFIR transparency obligations.",
    sources: [req("ESMA", "MiFID II / MiFIR systematic internaliser regime")],
  },

  // ── Infrastructure and industry bodies ──────────────────────────────────────
  {
    id: "trade-repository",
    label: "Trade repository",
    terms: ["trade repository", "trade repositories"],
    topics: ["trade-repository"],
    definition: "A trade repository is a registered entity that centrally collects and maintains records of derivatives or securities financing transactions reported by firms, validates submissions and makes the data available to regulators.",
    why: "Trade repositories matter because they are where reports are validated, paired and reconciled, so their feedback (acceptances, rejections and breaks) drives a firm's day-to-day reporting operations.",
    sources: [req("ESMA", "Trade repository registration and supervision")],
  },
  {
    id: "dtcc",
    label: "DTCC",
    terms: ["dtcc", "depository trust and clearing corporation", "depository trust & clearing corporation"],
    topics: ["dtcc"],
    definition: "DTCC is a financial-market infrastructure provider that, among other services, operates trade repositories used by firms to submit regulatory reporting data.",
    sources: [impl("DTCC", "DTCC Global Trade Repository")],
  },
  {
    id: "dtcc-gtr",
    label: "DTCC GTR",
    terms: ["gtr", "dtcc gtr", "global trade repository"],
    topics: ["dtcc", "trade-repository"],
    definition: "The DTCC Global Trade Repository (GTR) is DTCC's trade repository service, with regional entities that accept derivatives reports for regimes including CFTC, EMIR, UK EMIR and several APAC jurisdictions.",
    sources: [impl("DTCC", "DTCC Global Trade Repository technical specifications")],
    dateSensitive: true,
  },
  {
    id: "unavista",
    label: "UnaVista",
    terms: ["unavista"],
    topics: ["trade-repository"],
    definition: "UnaVista is LSEG's regulatory reporting platform, providing trade repository services for regimes such as EMIR and UK EMIR as well as MiFIR transaction reporting services.",
    sources: [impl("LSEG", "UnaVista service documentation")],
    dateSensitive: true,
  },
  {
    id: "regis-tr",
    label: "REGIS-TR",
    terms: ["regis tr", "registr"],
    topics: ["trade-repository"],
    definition: "REGIS-TR is a European trade repository within Deutsche Börse Group that accepts reports for regimes such as EMIR and SFTR.",
    sources: [impl("REGIS-TR", "REGIS-TR service documentation")],
    dateSensitive: true,
  },
  {
    id: "isda",
    label: "ISDA",
    terms: ["isda", "international swaps and derivatives association"],
    topics: ["isda-cdm"],
    definition: "ISDA is the International Swaps and Derivatives Association, an industry body that develops documentation, standards and implementation guidance for the derivatives market.",
    why: "ISDA matters because its documentation and reporting best practices shape how firms implement rules, but its guidance is industry practice and not law.",
    sources: [guide("ISDA", "ISDA documentation and reporting best practices")],
  },
  {
    id: "cdm",
    label: "ISDA CDM",
    terms: ["cdm", "common domain model", "isda cdm", "digital regulatory reporting", "drr"],
    topics: ["isda-cdm"],
    definition: "The ISDA CDM (Common Domain Model) is an open, machine-readable standard representation of trade events and lifecycle processes used to support consistency and automation, including digital regulatory reporting initiatives, and it is industry guidance rather than a regulatory requirement.",
    sources: [guide("ISDA", "ISDA Common Domain Model")],
  },
  {
    id: "cde",
    label: "CPMI-IOSCO Critical Data Elements",
    terms: ["cde", "cdes", "critical data elements", "cpmi iosco", "cpmi"],
    topics: ["data-quality"],
    definition: "The CPMI-IOSCO Critical Data Elements (CDE) guidance defines globally harmonised derivatives data elements, other than UTI and UPI, which authorities such as the CFTC and ESMA have drawn on when updating their reporting rules; it is international guidance implemented through local rules.",
    sources: [guide("BIS", "CPMI-IOSCO Harmonisation of critical OTC derivatives data elements")],
  },

  // ── Identifiers ─────────────────────────────────────────────────────────────
  {
    id: "uti",
    label: "UTI",
    terms: ["uti", "utis", "unique transaction identifier", "unique trade identifier", "usi"],
    topics: ["uti"],
    definition: "A UTI (Unique Transaction Identifier) is a globally unique identifier used to identify and match a reportable derivatives transaction across reporting parties and systems.",
    why: "The UTI matters because trade repositories pair and reconcile both sides of a trade using it, so late, missing or mismatched UTIs cause rejections and reconciliation breaks.",
    sources: [guide("BIS", "CPMI-IOSCO Technical Guidance — Harmonisation of the Unique Transaction Identifier")],
  },
  {
    id: "upi",
    label: "UPI",
    terms: ["upi", "upis", "unique product identifier"],
    topics: ["upi"],
    definition: "A UPI (Unique Product Identifier) is a code that identifies an OTC derivative product, issued by the ANNA Derivatives Service Bureau as the designated UPI service provider, and it is required in regimes such as CFTC reporting and EMIR Refit.",
    sources: [guide("BIS", "CPMI-IOSCO Technical Guidance — Harmonisation of the Unique Product Identifier"), impl("ANNA DSB", "UPI service")],
    dateSensitive: true,
  },
  {
    id: "lei",
    label: "LEI",
    terms: ["lei", "leis", "legal entity identifier"],
    topics: ["lei"],
    definition: "An LEI (Legal Entity Identifier) is a 20-character ISO 17442 code that uniquely identifies a legal entity participating in financial transactions, issued by accredited Local Operating Units within the GLEIF framework.",
    why: "The LEI matters because regimes such as EMIR, SFTR, MiFIR and CFTC use it to identify counterparties, and lapsed or invalid LEIs are a frequent cause of rejections.",
    sources: [impl("GLEIF", "LEI issuance and validation")],
  },
  {
    id: "isin",
    label: "ISIN",
    terms: ["isin", "isins", "international securities identification number"],
    topics: ["data-quality"],
    definition: "An ISIN (International Securities Identification Number) is the 12-character ISO 6166 code that identifies a specific security or financial instrument, allocated by national numbering agencies.",
    sources: [impl("ANNA DSB", "ISIN allocation")],
  },
  {
    id: "cfi",
    label: "CFI",
    terms: ["cfi", "classification of financial instruments"],
    topics: ["data-quality"],
    definition: "A CFI (Classification of Financial Instruments) code is the six-character ISO 10962 code that classifies a financial instrument by type and key attributes.",
    sources: [],
  },
  {
    id: "mic",
    label: "MIC",
    terms: ["mic", "market identifier code"],
    topics: ["data-quality"],
    definition: "A MIC (Market Identifier Code) is the four-character ISO 10383 code that identifies a trading venue or market, used to report where a transaction was executed.",
    sources: [],
  },
  {
    id: "bic",
    label: "BIC",
    terms: ["bic", "business identifier code", "swift code"],
    topics: ["data-quality"],
    definition: "A BIC (Business Identifier Code) is the ISO 9362 code, administered by SWIFT, that identifies financial and non-financial institutions in payments and financial messaging.",
    sources: [impl("SWIFT", "ISO 9362 BIC registration")],
  },

  // ── Reporting operations ────────────────────────────────────────────────────
  {
    id: "validation",
    label: "Validation",
    terms: ["validation", "validations", "validation rules", "validation rule"],
    topics: ["trade-repository", "data-quality"],
    definition: "Validation is the set of schema, format and business-rule checks applied to a report, by the firm before submission and by the trade repository on receipt, to confirm it meets the reporting specification.",
    sources: [req("ESMA", "EMIR reporting validation rules")],
    dateSensitive: true,
  },
  {
    id: "rejection",
    label: "Rejection",
    terms: ["rejection", "rejections", "rejected", "reject", "rejects", "rejection code", "rejection codes"],
    topics: ["trade-repository", "operations"],
    definition: "A rejection is a trade repository or regulator response indicating that a submission failed validation, such as a schema, format or business-rule check, so the report is not accepted and must be corrected and resubmitted.",
    sources: [],
  },
  {
    id: "reconciliation",
    label: "Reconciliation and pairing",
    terms: ["reconciliation", "reconciliations", "pairing", "matching", "breaks", "reconciliation breaks"],
    topics: ["trade-repository", "data-quality"],
    definition: "Pairing and reconciliation is the process by which a trade repository links both counterparties' reports of the same trade, typically by UTI, and compares key fields to identify breaks that firms must investigate and resolve.",
    sources: [],
  },
  {
    id: "delegated-reporting",
    label: "Delegated reporting",
    terms: ["delegated reporting", "delegation", "reporting on behalf"],
    topics: ["operations", "emir"],
    definition: "Delegated reporting is an arrangement where one party, often a dealer or third-party provider, submits reports on behalf of another, while legal responsibility for accurate and timely reporting may remain with the original counterparty depending on the regime.",
    sources: [],
    dateSensitive: true,
  },
  {
    id: "lifecycle-events",
    label: "Lifecycle events",
    terms: ["lifecycle event", "lifecycle events", "lifecycle", "action type", "action types", "event type", "event types"],
    topics: ["operations", "trade-repository"],
    definition: "Lifecycle events are changes to a reported trade after execution, such as modifications, terminations, novations, compressions and corrections, which must be reported using the regime's action and event types.",
    sources: [],
    dateSensitive: true,
  },
  {
    id: "iso-20022",
    label: "ISO 20022",
    terms: ["iso 20022", "iso20022", "xml reporting"],
    topics: ["iso-20022"],
    definition: "ISO 20022 is the international standard for financial messaging whose XML schemas are used for regulatory reporting submissions under regimes such as EMIR Refit, SFTR and MiFIR.",
    sources: [],
    dateSensitive: true,
  },
];

/** Prewritten comparisons keyed by the two entry ids, sorted alphabetically and joined with "|". */
export const COMPARISONS: Record<string, string> = {
  "cftc|emir": `CFTC reporting applies to US-regulated swaps markets, while EMIR applies to the EU derivatives framework, with differences in scope, reporting rules, data requirements, authorities and reporting infrastructure.
- Authority: CFTC (US) vs ESMA and national competent authorities (EU)
- Rules: CFTC Parts 43 and 45 vs EMIR and its Refit technical standards
- Reported to: swap data repositories vs trade repositories
- Public data: Part 43 real-time public dissemination vs aggregate data published by trade repositories
- Who reports: generally one reporting counterparty vs both counterparties, subject to delegation and exemptions
- Shared identifiers: UTI, UPI and LEI`,
  "emir|uk-emir": `EU EMIR and UK EMIR started from the same rules, but since Brexit they are separate regimes with their own authorities, trade repositories and implementation timelines.
- Authority: ESMA and EU national competent authorities vs the FCA
- Trade repositories: ESMA-registered vs FCA-registered
- Refit go-live: 29 April 2024 (EU) vs 30 September 2024 (UK)
- Both use ISO 20022 XML with UTI, UPI and LEI, but validation rules and future changes can diverge`,
  "part-43|part-45": `CFTC Part 43 governs real-time public dissemination of anonymised swap price and volume data, while Part 45 governs confidential regulatory reporting of full swap data to swap data repositories for use by regulators.
- Audience: the public vs regulators
- Content: price, notional and key economic terms without counterparty identity vs creation, continuation, valuation and margin/collateral data with identifiers
- Timing: as soon as technologically practicable vs rule-specific regulatory deadlines`,
  "aml|transaction-reporting": `AML reporting flags suspected financial crime to a financial intelligence unit when suspicion arises, whereas regulatory transaction reporting routinely reports every in-scope trade to a regulator or trade repository for market transparency and oversight.
- Trigger: suspicion or thresholds vs every reportable transaction
- Recipient: financial intelligence unit vs regulator or trade repository
- Purpose: detecting financial crime vs market, systemic-risk and market-abuse oversight`,
  "cftc|sec": `The CFTC regulates swaps reported to swap data repositories, while the SEC regulates security-based swaps reported to security-based swap data repositories under Regulation SBSR.
- CFTC scope: swaps such as interest rate, FX and broad-based index credit swaps
- SEC scope: security-based swaps such as single-name credit default swaps and swaps on single securities or narrow-based indices
- Rules: CFTC Parts 43 and 45 vs Regulation SBSR`,
  "cftc|sbsr": `The CFTC regulates swaps reported to swap data repositories, while the SEC regulates security-based swaps reported to security-based swap data repositories under Regulation SBSR.
- CFTC scope: swaps such as interest rate, FX and broad-based index credit swaps
- SEC scope: security-based swaps such as single-name credit default swaps and swaps on single securities or narrow-based indices
- Rules: CFTC Parts 43 and 45 vs Regulation SBSR`,
  "transaction-reporting|transparency-reporting": `MiFIR transaction reporting sends detailed, confidential reports of executed transactions to competent authorities for market abuse surveillance, while transparency reporting publishes pre- and post-trade price and volume information to the market.
- Audience: regulators vs the public
- Content: full transaction details including buyer, seller, decision-maker and trader identifiers vs price, volume and time
- Channel: typically an ARM or direct to the authority vs trading venues and APAs`,
  "emir|mifir": `MiFIR transaction reporting covers executed transactions in financial instruments reported to national competent authorities for market abuse surveillance, whereas EMIR covers derivatives contracts reported to trade repositories for systemic-risk oversight.
- Recipient: competent authority, often via an ARM, vs trade repository
- Scope: financial instruments admitted to or traded on venues vs OTC and exchange-traded derivatives contracts
- Data: execution details and decision-maker identifiers vs counterparty, lifecycle, valuation and collateral data`,
  "mifid|mifir": `MiFID II is a directive transposed into national law that governs investment firms, venues and investor protection, while MiFIR is a directly applicable regulation that sets transaction reporting, transparency and reference data requirements.
- Legal form: directive (national transposition) vs regulation (directly applicable)
- Reporting relevance: organisational and conduct rules vs transaction and transparency reporting obligations`,
};
