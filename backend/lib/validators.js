export function validateHeadlines(headlines) {
  const seen = new Set();
  const errors = [];
  const deduped = (headlines || [])
    .map((h) => String(h || "").trim())
    .filter((h) => {
      if (!h) return false;
      const key = h.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((h) => h.replace(/[\u{1F300}-\u{1FAFF}]/gu, ""));
  const clipped = deduped.map((h) => (h.length > 30 ? h.slice(0, 30) : h));
  clipped.forEach((h, i) => {
    if (h.length > 30) errors.push(`headline_${i}_too_long(${h.length})`);
  });
  return { ok: errors.length === 0, errors, deduped: clipped };
}

export function validateDescriptions(descriptions) {
  const seen = new Set();
  const errors = [];
  const deduped = (descriptions || [])
    .map((d) => String(d || "").trim())
    .filter((d) => {
      if (!d) return false;
      const key = d.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((d) => d.replace(/[\u{1F300}-\u{1FAFF}]/gu, ""));
  const clipped = deduped.map((d) => (d.length > 90 ? d.slice(0, 90) : d));
  clipped.forEach((d, i) => {
    if (d.length > 90) errors.push(`description_${i}_too_long(${d.length})`);
  });
  return { ok: errors.length === 0, errors, deduped: clipped };
}

export function validateRSA(headlines, descriptions) {
  const vh = validateHeadlines(headlines || []);
  const vd = validateDescriptions(descriptions || []);
  return {
    ok: vh.ok && vd.ok,
    errors: [...vh.errors, ...vd.errors],
    clipped: { h: vh.deduped, d: vd.deduped },
  };
}
