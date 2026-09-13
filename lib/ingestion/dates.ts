const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

// FCA (Drupal) style: "Thursday, September 10, 2026 - 15:04"
const DRUPAL_STYLE = /^(?:[A-Za-z]+,\s*)?([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*-\s*(\d{1,2}):(\d{2})$/;

/**
 * Parses the date formats seen in official feeds: RFC 822 (pubDate), ISO 8601
 * (dc:date, <time datetime>) and the FCA's Drupal format. The FCA format has no
 * time zone; it is stored as UTC, so the time may be off by up to an hour —
 * the platform only displays the date.
 */
export function parseFeedDate(raw: string | null | undefined): Date | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const drupal = DRUPAL_STYLE.exec(value);
  if (drupal) {
    const month = MONTHS[drupal[1].toLowerCase()];
    if (month === undefined) return null;
    return new Date(Date.UTC(Number(drupal[3]), month, Number(drupal[2]), Number(drupal[4]), Number(drupal[5])));
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

/** ESMA puts the date inside the escaped HTML description as <time datetime="…">. */
export function extractEmbeddedDate(html: string): Date | null {
  const match = /datetime="([^"]+)"/.exec(html);
  return match ? parseFeedDate(match[1]) : null;
}
