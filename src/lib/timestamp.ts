/** Lightweight date-time value for the demo build. */
export class Timestamp {
  private readonly _ms: number

  constructor(seconds: number, nanoseconds = 0) {
    this._ms = seconds * 1000 + Math.floor(nanoseconds / 1e6)
  }

  static now(): Timestamp {
    return Timestamp.fromDate(new Date())
  }

  static fromDate(date: Date): Timestamp {
    return new Timestamp(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1e6)
  }

  toDate(): Date {
    return new Date(this._ms)
  }

  toMillis(): number {
    return this._ms
  }
}

export function toTimestamp(value: unknown): Timestamp | null {
  if (!value) return null
  if (value instanceof Timestamp) return value
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const d = (value as { toDate: () => Date }).toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? Timestamp.fromDate(d) : null
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d)
  }
  if (typeof value === 'object' && value !== null && '_seconds' in value) {
    const sec = Number((value as { _seconds: number })._seconds)
    const nano = Number((value as { _nanoseconds?: number })._nanoseconds ?? 0)
    if (Number.isFinite(sec)) return new Timestamp(sec, nano)
  }
  return null
}

export function timestampToIso(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null
  return ts.toDate().toISOString()
}
