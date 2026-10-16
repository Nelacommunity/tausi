// Small deterministic helpers for building seed questions, so re-running the
// seed produces identical data.

/** Mulberry32 — tiny seeded PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick `n` distinct items from `pool`, excluding anything equal to `exclude`. */
export function pick<T>(pool: T[], n: number, rand: () => number, exclude?: (x: T) => boolean): T[] {
  return shuffle(pool.filter((x) => !exclude?.(x)), rand).slice(0, n);
}

// ── Pinyin: numbered ("ni3 hao3") → tone marks ("nǐ hǎo") ────────────────
const MARKS: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à", "a"],
  e: ["ē", "é", "ě", "è", "e"],
  i: ["ī", "í", "ǐ", "ì", "i"],
  o: ["ō", "ó", "ǒ", "ò", "o"],
  u: ["ū", "ú", "ǔ", "ù", "u"],
  v: ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
};

function markSyllable(syl: string): string {
  const m = syl.match(/^([a-zv]+)([1-5])$/);
  if (!m) return syl.replace(/v/g, "ü");
  const [, body, toneStr] = m;
  const tone = Number(toneStr) - 1;
  // Standard placement: a or e takes the mark; in "ou" the o does; otherwise the last vowel.
  let idx = body.search(/[ae]/);
  if (idx === -1) idx = body.indexOf("ou");
  if (idx === -1) {
    for (let i = body.length - 1; i >= 0; i--) {
      if ("iouv".includes(body[i])) { idx = i; break; }
    }
  }
  if (idx === -1) return body.replace(/v/g, "ü");
  const marked = body.slice(0, idx) + MARKS[body[idx]][tone] + body.slice(idx + 1);
  return marked.replace(/v/g, "ü");
}

/**
 * "ni3 hao3" → "nǐhǎo" (syllables joined, as written in dictionaries).
 * A syllable starting with a/e/o after the first gets an apostrophe: nǚ'ér.
 */
export function pinyin(numbered: string): string {
  return numbered
    .split(" ")
    .map((s, i) => (i > 0 && /^[aeo]/.test(s) ? "'" : "") + markSyllable(s))
    .join("");
}

/** Wrong-tone variants of a numbered pinyin string, for tone distractors. */
export function toneVariants(numbered: string, n: number, rand: () => number): string[] {
  const syls = numbered.split(" ");
  const seen = new Set([pinyin(numbered)]);
  const out: string[] = [];
  for (let attempt = 0; attempt < 40 && out.length < n; attempt++) {
    const copy = syls.map((s) => {
      const m = s.match(/^([a-zv]+)([1-5])$/);
      if (!m || m[2] === "5" || rand() < 0.4) return s;
      const tones = ["1", "2", "3", "4"].filter((t) => t !== m[2]);
      return m[1] + tones[Math.floor(rand() * tones.length)];
    });
    const v = pinyin(copy.join(" "));
    if (!seen.has(v)) { seen.add(v); out.push(v); }
  }
  return out;
}
