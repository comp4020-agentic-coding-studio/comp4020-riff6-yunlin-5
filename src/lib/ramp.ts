/**
 * The course's one ordinal ramp, shared by every figure that draws an
 * ordered set of things.
 *
 * The endpoints below were validated as an ordinal ramp against both theme
 * surfaces: a single hue (the brand gold), monotone lightness, adjacent
 * dL >= 0.06, and the step nearest each surface still clearing it. Dark mode
 * flips the anchor, so "further from the surface" always means "later in the
 * sequence" in either theme.
 *
 * Every step derives from `--at-primary` via relative colour, so the brand
 * package stays the single source of the palette --- change the gold and
 * every figure follows.
 *
 * Use this only where the order is real (chronological, staged, tiered).
 * Shading a nominal set by size re-encodes what a bar length already shows;
 * those take one colour and let their labels carry identity.
 */
export function ordinalStep(index: number, total: number): string {
  const t = total > 1 ? index / (total - 1) : 0;
  const mix = (from: number, to: number) => from + (to - from) * t;
  const light = `oklch(from var(--at-primary) ${(mix(0.72, 0.44) * 100).toFixed(1)}% ${mix(0.112, 0.092).toFixed(3)} h)`;
  const dark = `oklch(from var(--at-primary) ${(mix(0.55, 0.85) * 100).toFixed(1)}% ${mix(0.115, 0.1).toFixed(3)} h)`;
  return `light-dark(${light}, ${dark})`;
}
