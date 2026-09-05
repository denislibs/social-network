function hash(seed: number | string): number {
  let h = 2166136261
  const str = String(seed)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hsl2hex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
/** n² цветов вокруг базового оттенка, как «карта цветов» в прототипе */
export function paletteFor(seed: number | string, count: number): string[] {
  const rnd = mulberry32(hash(seed))
  const baseHue = Math.floor(rnd() * 360)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (rnd() - 0.5) * 80 + 360) % 360
    out.push(hsl2hex(hue, 0.55 + rnd() * 0.3, 0.45 + rnd() * 0.3))
  }
  return out
}
/** Меш-градиент: n×n радиальных пятен + линейная подложка средним цветом */
export function meshGradient(seed: number | string, n = 3): string {
  const cols = paletteFor(seed, n * n)
  const r = Math.round(150 / n)
  const layers = cols.map((c, i) => {
    const x = (((i % n) + 0.5) / n) * 100
    const y = ((Math.floor(i / n) + 0.5) / n) * 100
    return `radial-gradient(circle at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${c} 0%, ${c}00 ${r}%)`
  })
  const base = cols[Math.floor(cols.length / 2)] ?? '#888888'
  return `${layers.join(',')},linear-gradient(${base},${base})`
}
