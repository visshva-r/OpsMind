/**
 * Citation excerpts are windowed out of the middle of a document, so they carry
 * leading and trailing ellipses. Passing that raw string as a deep-link anchor
 * meant the target page searched the document for "..." and never highlighted
 * anything. Strip the ellipses and snap to a word boundary.
 */
export function citationAnchor(excerpt: string, maxLen = 60): string {
  const cleaned = excerpt
    .replace(/^\s*\.{3}\s*/, "")
    .replace(/\s*\.{3}\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLen) return cleaned;

  const truncated = cleaned.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated).trim();
}

/**
 * Locates the anchor in the document, shortening it until it matches. Excerpt
 * whitespace does not always survive the round trip, so an exact match is not
 * guaranteed.
 */
export function findAnchor(
  text: string,
  anchor: string
): { index: number; length: number } | null {
  const cleaned = citationAnchor(anchor, anchor.length);
  if (cleaned.length < 8) return null;

  const haystack = text.toLowerCase();
  for (let length = cleaned.length; length >= 12; length -= 8) {
    const needle = cleaned.slice(0, length).trim().toLowerCase();
    const index = haystack.indexOf(needle);
    if (index !== -1) return { index, length: needle.length };
  }

  return null;
}
