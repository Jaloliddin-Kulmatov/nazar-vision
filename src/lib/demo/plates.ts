/**
 * Uzbek licence plates (2008 standard), read from noisy OCR text.
 *
 *   Private cars:  01 A 123 BC  (region · letter · 3 digits · 2 letters)
 *   Companies:     01 123 ABC   (region · 3 digits · 3 letters)
 *
 * The first two digits are the region. OCR often swaps look-alike characters (O/0, B/8, S/5),
 * so each position is coerced to the type the format expects and the number of fixes is counted.
 */

export const UZ_REGIONS = {
  "01": "tashkentCity",
  "10": "tashkentRegion",
  "20": "sirdaryo",
  "25": "jizzakh",
  "30": "samarkand",
  "40": "fergana",
  "50": "namangan",
  "60": "andijan",
  "70": "kashkadarya",
  "75": "surkhandarya",
  "80": "bukhara",
  "85": "navoi",
  "90": "khorezm",
  "95": "karakalpakstan",
} as const;
export type RegionId = (typeof UZ_REGIONS)[keyof typeof UZ_REGIONS];

export type PlateKind = "private" | "company";
export type Plate = {
  /** Formatted the way it is printed, e.g. "01 A 123 BC". */
  text: string;
  kind: PlateKind;
  regionCode: string;
  region: RegionId;
  /** Characters that had to be swapped (O→0 and the like); 0 is a clean read. */
  fixes: number;
};

const TEMPLATES: { kind: PlateKind; pattern: string; groups: number[] }[] = [
  { kind: "private", pattern: "DDLDDDLL", groups: [2, 1, 3, 2] },
  { kind: "company", pattern: "DDDDDLLL", groups: [2, 3, 3] },
];

/** Look-alikes, most likely first. Some letters can stand for more than one digit (a worn "0" often reads as "G"). */
const TO_DIGIT: Record<string, string[]> = {
  O: ["0"], Q: ["0"], D: ["0"], U: ["0"], C: ["0"], I: ["1"], L: ["1"], J: ["1"], Z: ["2"], S: ["5"], B: ["8"], G: ["6", "0"], T: ["7", "1"], A: ["4"],
};
const TO_LETTER: Record<string, string[]> = { "0": ["O"], "1": ["I"], "2": ["Z"], "4": ["A"], "5": ["S"], "6": ["G"], "7": ["T"], "8": ["B"] };

/** Every way `chunk` fits the pattern, with how many characters had to be swapped. */
function coerce(chunk: string, pattern: string): { text: string; fixes: number }[] {
  let outs = [{ text: "", fixes: 0 }];
  for (let i = 0; i < pattern.length; i++) {
    const c = chunk[i];
    const wantDigit = pattern[i] === "D";
    const isDigit = c >= "0" && c <= "9";
    if (wantDigit === isDigit) {
      outs = outs.map((o) => ({ text: o.text + c, fixes: o.fixes }));
      continue;
    }
    const options = (wantDigit ? TO_DIGIT[c] : TO_LETTER[c]) ?? [];
    if (!options.length) return [];
    outs = outs.flatMap((o) => options.map((x) => ({ text: o.text + x, fixes: o.fixes + 1 })));
  }
  return outs;
}

const format = (s: string, groups: number[]) => {
  const parts: string[] = [];
  let i = 0;
  for (const g of groups) {
    parts.push(s.slice(i, i + g));
    i += g;
  }
  return parts.join(" ");
};

/** Every way to read `clean` as `len` characters: plain windows, and windows with one stray character dropped. */
function* candidates(clean: string, len: number): Generator<{ text: string; dropped: number; unused: number }> {
  for (let start = 0; start + len <= clean.length; start++) {
    yield { text: clean.slice(start, start + len), dropped: 0, unused: clean.length - len };
  }
  // OCR sometimes doubles a character or reads a bolt or a divider as one ("01|Q" → "01IQ").
  for (let start = 0; start + len + 1 <= clean.length; start++) {
    const win = clean.slice(start, start + len + 1);
    for (let i = 1; i < win.length - 1; i++) {
      // A doubled character ("1884") is the most common slip, so dropping one of a pair costs less.
      const doubled = win[i] === win[i - 1] || win[i] === win[i + 1];
      yield { text: win.slice(0, i) + win.slice(i + 1), dropped: doubled ? 0.75 : 1, unused: clean.length - len - 1 };
    }
  }
}

/**
 * Best Uzbek plate in a piece of OCR text, or null when nothing fits.
 * Cost: 1 per swapped look-alike, 1 per dropped character (0.75 if it was doubled), 0.5 per character left unused.
 */
export function parseUzPlate(raw: string, maxCost = 2.5): Plate | null {
  let clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // The "UZ" mark next to the flag is not part of the number.
  if (clean.length > 8 && clean.endsWith("UZ")) clean = clean.slice(0, -2);
  if (clean.length > 8 && clean.startsWith("UZ")) clean = clean.slice(2);
  let best: (Plate & { cost: number }) | null = null;
  for (const tpl of TEMPLATES) {
    for (const c of candidates(clean, tpl.pattern.length)) {
      for (const got of coerce(c.text, tpl.pattern)) {
        const cost = got.fixes + c.dropped + 0.5 * c.unused;
        if (cost > maxCost || (best && cost >= best.cost)) continue;
        const code = got.text.slice(0, 2) as keyof typeof UZ_REGIONS;
        const region = UZ_REGIONS[code];
        if (!region) continue;
        best = { text: format(got.text, tpl.groups), kind: tpl.kind, regionCode: code, region, fixes: got.fixes + (c.dropped ? 1 : 0), cost };
      }
    }
  }
  if (!best) return null;
  const { cost: _cost, ...plate } = best;
  void _cost;
  return plate;
}
