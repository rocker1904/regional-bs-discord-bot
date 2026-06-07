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
    }

    /** Set lastRunAt without disturbing the enabled flag (load-or-create, then save). */
    private async recordRun(guildID: string): Promise<void> {
        const row = (await ProgressReportState.findOneBy({guildID})) ?? ProgressReportState.create({guildID, enabled: true, lastRunAt: null});
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
