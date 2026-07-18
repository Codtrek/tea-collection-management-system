/** WCAG relative-luminance + contrast ratio, used by FND-01 to print live ratios. */

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((x) => x + x)
          .join('')
      : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Contrast ratio between two hex colors, e.g. 4.53. */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/** `4.53:1` formatted, plus AA pass flag at the 4.5:1 threshold. */
export function contrastLabel(fg: string, bg: string): { ratio: string; passAA: boolean } {
  const r = contrastRatio(fg, bg)
  return { ratio: `${r.toFixed(2)}:1`, passAA: r >= 4.5 }
}
