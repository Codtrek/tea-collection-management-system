/**
 * Round axis ticks from 0 that cover `max`: 0/100/200/300/400 rather than 0/94/188/282/376.
 * The step is 1, 2, 2.5 or 5 × a power of ten, chosen so there are at most `count` steps.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1]
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 1e6; v += step) ticks.push(Number(v.toPrecision(12)))
  return ticks
}
