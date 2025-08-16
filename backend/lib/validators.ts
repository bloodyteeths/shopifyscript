export type RSAAssets = { H: string[]; D: string[] };

export function validateHeadlines(headlines: string[]): { ok: boolean; errors: string[]; deduped: string[] } {
  const seen = new Set<string>();
  const errors: string[] = [];
  const deduped = headlines
    .map((h) => (h || '').trim())
    .filter((h) => {
      if (h.length === 0) return false;
      const key = h.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  deduped.forEach((h, i) => {
    if (h.length > 30) errors.push(`headline_${i}_too_long(${h.length})`);
  });
  return { ok: errors.length === 0, errors, deduped };
}

export function validateDescriptions(descriptions: string[]): { ok: boolean; errors: string[]; deduped: string[] } {
  const seen = new Set<string>();
  const errors: string[] = [];
  const deduped = descriptions
    .map((d) => (d || '').trim())
    .filter((d) => {
      if (d.length === 0) return false;
      const key = d.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  deduped.forEach((d, i) => {
    if (d.length > 90) errors.push(`description_${i}_too_long(${d.length})`);
  });
  return { ok: errors.length === 0, errors, deduped };
}




