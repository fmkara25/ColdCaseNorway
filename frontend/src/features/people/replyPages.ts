// Keep the authored text intact; paging changes presentation, never the saved response.
export function replyPages(text: string, limit = 420): string[] {
  if (!text) return [""];
  const pages: string[] = [];
  let remaining = text;
  while (remaining.length > limit) {
    let split = remaining.lastIndexOf("\n\n", limit);
    if (split < limit / 2) split = remaining.lastIndexOf(" ", limit);
    if (split <= 0) split = limit;
    pages.push(remaining.slice(0, split));
    remaining = remaining.slice(split);
    // Retain all whitespace so joining pages reproduces the original source exactly.
    if (remaining.trim().length === 0) { pages[pages.length - 1] += remaining; remaining = ""; }
  }
  if (remaining) pages.push(remaining);
  return pages;
}
