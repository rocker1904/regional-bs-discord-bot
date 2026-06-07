/**
 * Human-readable whole-day difference between `date` and `now` (default: current
 * time), rounded up. `now` is injectable so the result is deterministic in tests.
 */
export default function dateDiff(date: Date, now: Date = new Date()): string {
    const diff = Math.abs(now.getTime() - date.getTime());
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 1 ? `${days} days` : '1 day';
}
