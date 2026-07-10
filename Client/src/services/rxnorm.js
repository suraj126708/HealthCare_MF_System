const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";

export async function searchRxNormDrugs(term, { maxEntries = 12, signal } = {}) {
  const query = String(term || "").trim();
  if (query.length < 2) return [];

  const url = `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(query)}&maxEntries=${maxEntries}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("RxNorm search failed");

  const data = await res.json();
  const raw = data?.approximateGroup?.candidate ?? [];
  const candidates = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const seen = new Set();
  const results = [];

  for (const item of candidates) {
    const name = item?.name?.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      name,
      rxcui: item.rxcui || null,
    });

    if (results.length >= 10) break;
  }

  return results;
}
