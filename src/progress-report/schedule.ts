const RUN_HOUR = 12; // noon, server-local

/** The 1st-of-month at noon (local) for the month containing `now`. */
function thisMonthRun(now: Date): Date {
    return new Date(now.getFullYear(), now.getMonth(), 1, RUN_HOUR, 0, 0, 0);
}

/** The next 1st-of-month at noon (local) at or after `now`. */
export function nextMonthlyRun(now: Date): Date {
    const target = thisMonthRun(now);
    if (now <= target) return target;
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, RUN_HOUR, 0, 0, 0);
}

/**
 * Whether a guild's monthly run is due: now is at/after this month's run time AND it has not
 * already run this calendar month. Per-guild idempotent and restart-safe.
 */
export function isDueThisMonth(now: Date, lastRunAt: Date | null): boolean {
    if (now < thisMonthRun(now)) return false;
    if (lastRunAt === null) return true;
    return lastRunAt.getFullYear() !== now.getFullYear() || lastRunAt.getMonth() !== now.getMonth();
}

// Max delay setTimeout accepts (~24.8 days). A month can exceed this, so we tick daily.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fires `onTick` once a day. The caller decides per-guild whether a run is due (via
 * isDueThisMonth) — this only provides the daily heartbeat, capped under setTimeout's range.
 */
export class MonthlyScheduler {
    private timer?: NodeJS.Timeout;
    private stopped = true;

    constructor(private readonly onTick: () => void) {}

    public start(): void {
        if (!this.stopped) return;
        this.stopped = false;
        const tick = () => {
            if (this.stopped) return;
            this.onTick();
            this.timer = setTimeout(tick, ONE_DAY_MS);
        };
        // First tick on the next loop turn so construction stays cheap.
        this.timer = setTimeout(tick, 0);
    }

    public stop(): void {
        this.stopped = true;
        if (this.timer) clearTimeout(this.timer);
    }
}
