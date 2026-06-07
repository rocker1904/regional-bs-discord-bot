import {nextMonthlyRun} from './schedule';

/**
 * Human-readable progress-report status line. Pure (no Discord/DB imports) so it stays
 * testable without pulling in the Bot/entity graph.
 */
export function statusLine(enabled: boolean, lastRunAt: Date | null, now: Date): string {
    const state = enabled ? 'enabled' : 'disabled';
    const next = enabled ? `next run ${nextMonthlyRun(now).toUTCString()}` : 'no scheduled run';
    const last = lastRunAt ? `last run ${lastRunAt.toUTCString()}` : 'never run';
    return `Progress report is **${state}** — ${next}; ${last}.`;
}
