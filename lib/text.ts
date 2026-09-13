const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "do", "does", "for", "from", "has", "have", "how", "i", "if",
  "in", "is", "it", "of", "on", "or", "our", "should", "that", "the", "their", "this", "to", "we", "what", "when",
  "where", "which", "who", "why", "will", "with", "you", "your", "firms", "happens", "can", "any", "anyone",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Loose match so "rejected" hits "reject" and "events" hits "event". */
export function termsMatch(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  if (token.length < 4 || keyword.length < 4) return false;
  return token.startsWith(keyword) || keyword.startsWith(token);
}

export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
