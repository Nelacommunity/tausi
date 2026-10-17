import { pinyin } from 'pinyin-pro';

export interface Syllable {
  char: string;
  py: string;
  tone: number; // 1–4, 0 = neutral, -1 = not Chinese
}

const HAN = /\p{Script=Han}/u;
export const isHan = (s: string) => HAN.test(s);

/** Per-character pinyin with tone numbers (tone sandhi for 一/不 applied). */
export function syllables(text: string): Syllable[] {
  if (!text) return [];
  const data = pinyin(text, { type: 'all' });
  return data.map((d) => ({
    char: d.origin,
    py: d.isZh ? d.pinyin : '',
    tone: d.isZh ? (d.num === 5 ? 0 : d.num) : -1,
  }));
}

export const toPinyin = (text: string) => pinyin(text, { toneType: 'symbol' });

/** Split text into words (browser ICU dictionary), falling back to characters. */
export function segment(text: string): string[] {
  const Seg = (Intl as any).Segmenter;
  if (Seg) {
    const seg = new Seg('zh', { granularity: 'word' });
    return Array.from(seg.segment(text), (s: any) => s.segment as string);
  }
  return Array.from(text);
}

/** Pinyin with tone marks → numbers (nǐ hǎo → ni3 hao3); used for loose answer matching. */
export function normalizePinyin(p: string): string {
  const map: Record<string, [string, number]> = {};
  const rows: [string, string][] = [
    ['a', 'āáǎà'],
    ['e', 'ēéěè'],
    ['i', 'īíǐì'],
    ['o', 'ōóǒò'],
    ['u', 'ūúǔù'],
    ['ü', 'ǖǘǚǜ'],
  ];
  for (const [base, marks] of rows) [...marks].forEach((m, i) => (map[m] = [base, i + 1]));
  return p
    .toLowerCase()
    .split(/\s+/)
    .map((syl) => {
      let tone = 0;
      const plain = [...syl]
        .map((c) => {
          if (map[c]) {
            tone = map[c][1];
            return map[c][0];
          }
          return c;
        })
        .join('');
      return plain + (tone || '');
    })
    .join(' ');
}

export const TONE_NAMES = ['neutral', '1st · high flat', '2nd · rising', '3rd · dip', '4th · falling'];
