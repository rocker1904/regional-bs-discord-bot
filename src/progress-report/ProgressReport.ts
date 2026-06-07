import {collect} from 'scoresaber.js';
import scoreSaber from '../util/scoreSaber';
import Bot from '../Bot';
import logger from '../util/logger';
import {guildConfigs} from '../config';
import {ProgressReportState} from '../entity/ProgressReportState';
import groupIntoPages, {type RankTier} from './groupIntoPages';
import renderPage from './renderPage';
import fetchAvatar from './fetchAvatar';
import {MonthlyScheduler, isDueThisMonth} from './schedule';

export default class ProgressReport {
    private scheduler = new MonthlyScheduler(() => void this.runDue());
    private inFlight = new Set<string>(); // guild IDs with a run in progress (no duplicate posts)

    public start(): void {
        this.scheduler.start();
        logger.info('Progress report scheduler started');
    }

    public stop(): void {
        this.scheduler.stop();
    }

    /** Daily tick: run the monthly report for each configured, enabled, due guild. */
    private async runDue(): Promise<void> {
        const now = new Date();
        for (const guildConfig of guildConfigs) {
            if (!guildConfig.progressReportConfig) continue;
            const state = await ProgressReportState.findOneBy({guildID: guildConfig.guildID});
            if (!state?.enabled) continue; // default-disabled
            if (!isDueThisMonth(now, state.lastRunAt)) continue;
            await this.runGuild(guildConfig.guildID);
        }
    }

    /** Run the report for one guild now (manual or scheduled). Records lastRunAt on success. */
    public async runGuild(guildID: string): Promise<void> {
        const guildConfig = guildConfigs.find((g) => g.guildID === guildID);
        const channel = Bot.progressReportChannels[guildID];
        if (!guildConfig?.progressReportConfig || !channel) return;

        // Guard against overlapping runs (manual spam, or a manual run meeting the daily tick)
        // posting duplicate image sets; lastRunAt is only recorded after all pages send.
        if (this.inFlight.has(guildID)) {
            logger.info('Progress report already running for guild; skipping overlapping run', {guildID});
            return;
        }
        this.inFlight.add(guildID);
        try {
            const region = guildConfig.scoreSaberRegions.join(',');
            const players = await collect(
                scoreSaber.players.list({countries: region, sort: 'rank', sortDirection: 'asc'}),
                guildConfig.progressReportConfig.maxRegionRank,
            ).catch((err) => {
                logger.error('Progress report failed. Error fetching players.', {guildID});
                logger.error(err);
                return undefined;
            });
            if (!players) return;

            const tiers = await this.resolveTiers(guildID, guildConfig.regionRankGroups);
            if (!tiers) return;

            const pages = groupIntoPages(players, tiers);
            for (const page of pages) {
                const avatars = await Promise.all(page.map((row) => fetchAvatar(row.player.avatar)));
                const png = await renderPage(page, avatars);
                await channel.send({files: [{attachment: png, name: 'progress.png'}]});
            }

            await this.recordRun(guildID);
            logger.info(`Progress report posted for ${channel.guild.name} (${pages.length} image(s))`, {guildID});
        } finally {
            this.inFlight.delete(guildID);
        }
    }

    /**
     * Set lastRunAt without disturbing the enabled flag. A manual run can reach this for a
     * guild that has no state row yet, so the create fallback is enabled:false — recording a
     * run must never opt a guild into the monthly schedule (reports stay opt-in via `enable`).
     */
    private async recordRun(guildID: string): Promise<void> {
        const row = (await ProgressReportState.findOneBy({guildID})) ?? ProgressReportState.create({guildID, enabled: false, lastRunAt: null});
        row.lastRunAt = new Date();
        await row.save();
    }

    /** Resolve each region rank group to its role colour, sorted ascending by rank. */
    private async resolveTiers(guildID: string, regionRankGroups: RankGroup[]): Promise<RankTier[] | undefined> {
        const guild = Bot.guilds[guildID];
        const sorted = [...regionRankGroups].sort((a, b) => a.rank - b.rank);
        const tiers: RankTier[] = [];
        for (const group of sorted) {
            const role = await guild.roles.fetch(group.roleID).catch(() => null);
            if (!role) {
                logger.error(`Progress report: missing role ${group.roleID}`, {guildID});
                return undefined;
            }
            tiers.push({rank: group.rank, color: role.hexColor});
        }
        return tiers;
    }
}
