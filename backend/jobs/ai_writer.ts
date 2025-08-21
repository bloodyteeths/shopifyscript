import {
  validateHeadlines,
  validateDescriptions,
  RSAAssets,
} from "../lib/validators";

export type DraftRequest = {
  queries: string[];
};

export type DraftResult = {
  ok: boolean;
  assets: RSAAssets;
  errors: string[];
};

export async function buildDrafts(request: DraftRequest): Promise<DraftResult> {
  const candidatesH: string[] = [];
  const candidatesD: string[] = [];

  for (const q of request.queries) {
    const base = (q || "").trim().slice(0, 26);
    candidatesH.push(`${base} Deals`);
    candidatesH.push(`${base} Official Site`);
    candidatesD.push(`${base} — shop now with fast shipping and easy returns.`);
    candidatesD.push(`${base} — compare options and find your best fit today.`);
  }

  const vh = validateHeadlines(candidatesH);
  const vd = validateDescriptions(candidatesD);
  const ok = vh.ok && vd.ok;
  return {
    ok,
    assets: { H: vh.deduped, D: vd.deduped },
    errors: [...vh.errors, ...vd.errors],
  };
}
