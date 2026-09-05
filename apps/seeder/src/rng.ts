function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
export class Rng {
  private a: number
  private spare: number | null = null
  constructor(readonly seed: number) {
    this.a = seed >>> 0
  }
  next(): number {
    this.a = (this.a + 0x6d2b79f5) | 0
    let t = Math.imul(this.a ^ (this.a >>> 15), 1 | this.a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty')
    return arr[Math.floor(this.next() * arr.length)]!
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
    }
    return arr
  }
  gauss(mean = 0, sd = 1): number {
    if (this.spare !== null) {
      const v = this.spare
      this.spare = null
      return mean + sd * v
    }
    let u: number, v: number, s: number
    do {
      u = this.next() * 2 - 1
      v = this.next() * 2 - 1
      s = u * u + v * v
    } while (s >= 1 || s === 0)
    const m = Math.sqrt((-2 * Math.log(s)) / s)
    this.spare = v * m
    return mean + sd * u * m
  }
  lognormal(mu: number, sigma: number): number {
    return Math.exp(this.gauss(mu, sigma))
  }
  /** cum — неубывающие накопленные веса, последний == total */
  weightedIndex(cum: Float64Array): number {
    const x = this.next() * cum[cum.length - 1]!
    let lo = 0,
      hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid]! > x) hi = mid
      else lo = mid + 1
    }
    return lo
  }
  fork(label: string): Rng {
    return new Rng((this.seed ^ hashStr(label)) >>> 0)
  }
}
export function cumulative(weights: ArrayLike<number>): Float64Array {
  const out = new Float64Array(weights.length)
  let acc = 0
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i]!
    out[i] = acc
  }
  return out
}
