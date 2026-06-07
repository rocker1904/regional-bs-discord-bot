import {Collection, GuildMember, Role} from 'discord.js';
import {collect, type PlayerListing} from 'scoresaber.js';
import scoreSaber from './util/scoreSaber';
import selectRankGroup from './util/selectRankGroup';
import RankUpEmbed from './RankUpEmbed';
import Bot from './Bot';
import {rankUpdateInterval, guildConfigs} from './config';
import {GuildUser} from './entity/GuildUser';
import logger from './util/logger';

type Dict = {[key: string]: string};

export default class RoleUpdater {
    private timer!: NodeJS.Timeout;
    private stopped = true;
    private running = false;

    constructor() {
        // Make sure rank groups are sorted ascending
        for (const guildConfig of guildConfigs) {
            const {regionRankGroups, globalRankGroups} = guildConfig;
            regionRankGroups.sort((a, b) => a.rank - b.rank);
            globalRankGroups.sort((a, b) => a.rank - b.rank);
        }
        this.start();
    }

    public start() {
        if (this.stopped) {
            this.timer = setInterval(() => void this.main(), rankUpdateInterval * 1000 * 60);
            this.stopped = false;
            logger.info('Role updater started');
            void this.main();
        }
    }

    public stop() {
        if (!this.stopped) {
            clearInterval(this.timer);
            this.stopped = true;
            logger.info('Role updater stopped');
        }
    }

    // Returns true if it ran, false if a run was already in progress and this call
    // was skipped (the timer and the manual /role-update command share this guard).
    public async main(): Promise<boolean> {
        if (this.running) {
            logger.debug('Role update already in progress; skipping this run');
            return false;
        }
        this.running = true;
        try {
            logger.debug('Running role update');
            // One DB read for the whole run: maps each registered ScoreSaber ID to
            // its Discord ID (avoids a per-player query). The values double as the
            // set of bot-managed members for the demotion sweep — roles granted
            // manually to non-registered members are left alone.
            const guildUsers = await GuildUser.find({select: {discordID: true, scoreSaberID: true}});
            const discordIdByScoreSaberId = new Map(guildUsers.map((user) => [user.scoreSaberID, user.discordID]));
            const registered = new Set(guildUsers.map((user) => user.discordID));

            for (const {regionRankGroups, globalRankGroups, scoreSaberRegions, guildID} of guildConfigs) {
                const guild = Bot.guilds[guildID];
                if (!guild) continue;

                // Fetch the full member list once per guild: warms the cache for the
                // assignment passes and powers the demotion sweep (which needs to see
                // members who dropped out of the tracked top-N).
                const members = await guild.members.fetch().catch((err) => {
                    logger.error('Role update: failed to fetch guild members; skipping demotion sweep', {guildID});
                    logger.error(err);
                    return undefined;
                });

                // Each entry pairs a rank-group set with the Discord IDs that should
                // keep one of its roles. A pass is only added once its fetch succeeds,
                // so the sweep never strips a group it has no valid keep-set for.
                const sweeps: {rankGroups: RankGroup[]; keep: Set<string>}[] = [];

                // Update region ranks
                const lastRegionRankGroup = regionRankGroups.at(-1);
                if (lastRegionRankGroup) {
                    const scoreSaberRegion = scoreSaberRegions.join(',');
                    const regionalPlayers = await collect(
                        scoreSaber.players.list({countries: scoreSaberRegion, sort: 'rank', sortDirection: 'asc'}),
                        lastRegionRankGroup.rank,
                    ).catch((err) => {
                        logger.error('Regional role update failed. Error fetching players.');
                        logger.error(err);
                    });
                    if (regionalPlayers) {
                        const keep = await this.updateRankRolesOrdered(
                            regionalPlayers,
                            regionRankGroups,
                            guildID,
                            discordIdByScoreSaberId,
                            true,
                        );
                        sweeps.push({rankGroups: regionRankGroups, keep});
                    }
                }

                // Update global ranks
                const lastGlobalRankGroup = globalRankGroups.at(-1);
                if (lastGlobalRankGroup) {
                    const globalPlayers = await collect(
                        scoreSaber.players.list({sort: 'rank', sortDirection: 'asc'}),
                        lastGlobalRankGroup.rank,
                    ).catch((err) => {
                        logger.error('Global role update failed. Error fetching players.');
                        logger.error(err);
                    });
                    if (globalPlayers) {
                        const keep = await this.updateRankRoles(globalPlayers, globalRankGroups, guildID, discordIdByScoreSaberId);
                        sweeps.push({rankGroups: globalRankGroups, keep});
                    }
                }

                if (members && sweeps.length > 0) await RoleUpdater.removeStaleRankRoles(guildID, members, registered, sweeps);
            }
            logger.debug('Role update complete');
            return true;
        } finally {
            this.running = false;
        }
    }

    // Returns the set of Discord IDs that legitimately hold a rank role from this
    // group after the pass, so the caller can strip the role from everyone else.
    public async updateRankRoles(
        players: PlayerListing[],
        rankGroups: RankGroup[],
        guildID: string,
        discordIdByScoreSaberId: Map<string, string>,
        regional = false,
    ): Promise<Set<string>> {
        const keep = new Set<string>();
        for (const player of players) {
            const discordID = discordIdByScoreSaberId.get(player.id);
            if (!discordID) continue; // not a registered user
            if (await RoleUpdater.updateRankRole(player, discordID, rankGroups, guildID, regional)) keep.add(discordID);
        }
        return keep;
    }

    // For multiple regions at the same time (ie. AU and NZ for OCE), all players need to be fetched and the indicies used to determine rank
    public async updateRankRolesOrdered(
        players: PlayerListing[],
        rankGroups: RankGroup[],
        guildID: string,
        discordIdByScoreSaberId: Map<string, string>,
        regional = false,
    ): Promise<Set<string>> {
        const keep = new Set<string>();
        let rank = 1;
        for (const player of players) {
            // rank counts every player in the list so the combined-region index stays correct,
            // even for players who aren't registered with the bot.
            const discordID = discordIdByScoreSaberId.get(player.id);
            if (discordID && (await RoleUpdater.updateRankRole(player, discordID, rankGroups, guildID, regional, rank))) {
                keep.add(discordID);
            }
            rank++;
        }
        return keep;
    }

    // Assigns the correct rank role for a single (registered) player. Returns true
    // if they should keep a role from this group, false otherwise (not in the guild,
    // inactive, or outside every bracket).
    public static async updateRankRole(
        player: PlayerListing,
        discordID: string,
        rankGroups: RankGroup[],
        guildID: string,
        regional = false,
        rankOverride?: number,
    ): Promise<boolean> {
        const guild = Bot.guilds[guildID];
        // Hits the member cache warmed by main()'s bulk fetch; falls back to the API if missing.
        const guildMember = await guild.members.fetch(discordID).catch(() => undefined);
        if (!guildMember) return false;

        const playerRank = rankOverride ?? (regional ? player.stats.countryRank : player.stats.rank);

        // Work out which rank group they fall under (inactive accounts — rank 0 — get none).
        const playerRankGroup = player.stats.rank === 0 ? undefined : selectRankGroup(playerRank, rankGroups);

        // Remove every rank-group role they shouldn't have, in a single call
        const staleRoles = rankGroups
            .filter((rankGroup) => rankGroup.roleID !== playerRankGroup?.roleID)
            .map((rankGroup) => guildMember.roles.cache.get(rankGroup.roleID))
            .filter((role): role is Role => role !== undefined);
        if (staleRoles.length > 0) {
            await guildMember.roles.remove(staleRoles).catch((err) => {
                logger.error('Error while removing roles', {guildID});
                logger.error(err);
            });
            logger.info(
                `Removed rank role(s) in ${guild.name} from ${guildMember.user.tag}: ${staleRoles.map((role) => role.name).join(', ')}`,
            );
        }

        // If no player rank group, no need to add a role
        if (!playerRankGroup) return false;

        // Add their current rank role if they don't already have it
        if (!guildMember.roles.cache.has(playerRankGroup.roleID)) {
            const newRole = guild.roles.resolve(playerRankGroup.roleID);
            if (!newRole) {
                logger.error(`Can't find rank role for ${playerRankGroup.roleID} with rank ${playerRankGroup.rank}`, {guildID});
                return false;
            }
            await guildMember.roles.add(newRole).catch((err) => {
                logger.error('Error while adding role', {guildID});
                logger.error(err);
            });
            logger.info(`Added role in ${guild.name} to ${guildMember.user.tag}: ${newRole.name}`);
            if (Bot.rankupFeedChannels[guildID]) {
                const embed = new RankUpEmbed(player, newRole, regional, guildMember.displayName);
                await Bot.rankupFeedChannels[guildID].send({embeds: [embed]});
            }
        }

        return true;
    }

    // Strips rank roles from registered users who hold one but are no longer in the
    // tracked top-N (ie. they dropped below the lowest bracket since the last run).
    // One pass over the members covers every rank-group set; non-registered members
    // are skipped so manually-granted roles survive.
    private static async removeStaleRankRoles(
        guildID: string,
        members: Collection<string, GuildMember>,
        registered: Set<string>,
        sweeps: {rankGroups: RankGroup[]; keep: Set<string>}[],
    ): Promise<void> {
        const guild = Bot.guilds[guildID];
        const prepared = sweeps.map((sweep) => ({
            keep: sweep.keep,
            roleIDs: new Set(sweep.rankGroups.map((rankGroup) => rankGroup.roleID)),
        }));
        for (const member of members.values()) {
            if (!registered.has(member.id)) continue;
            const staleRoles: Role[] = [];
            for (const {keep, roleIDs} of prepared) {
                if (keep.has(member.id)) continue; // still in this group's top-N
                for (const role of member.roles.cache.values()) {
                    if (roleIDs.has(role.id)) staleRoles.push(role);
                }
            }
            if (staleRoles.length === 0) continue;
            await member.roles.remove(staleRoles).catch((err) => {
                logger.error('Error while removing stale rank roles', {guildID});
                logger.error(err);
            });
            logger.info(
                `Removed stale rank role(s) in ${guild.name} from ${member.user.tag}: ${staleRoles.map((role) => role.name).join(', ')}`,
            );
        }
    }

    public static async updateRegionRole(guildUser: GuildUser, guildID: string) {
        // Fetch their GuildMember object
        const guildMember = await Bot.guilds[guildID].members.fetch(guildUser.discordID).catch(() => {
            // If member can't be found, we can ignore the error here, it's handled below
        });

        if (!guildMember) return;

        const player = await scoreSaber.players.getBasic(guildUser.scoreSaberID).catch((err) => {
            logger.error('User regional role update failed. Error fetching player.');
            logger.error(err);
        });
        if (!player) return;
        const roleMap = guildConfigs.find((guildConfig) => guildConfig.guildID === guildID)!.roleMap as unknown as Dict;

        const roleID = roleMap[player.country.toLowerCase()] || roleMap[''];

        // Add their region role if they don't already have it
        if (!guildMember.roles.cache.some((role) => role.id === roleID)) {
            const newRole = Bot.guilds[guildID].roles.resolve(roleID);
            if (!newRole) {
                logger.error(`Can't find region role for ${roleID} with region ${player.country}`, {guildID});
                return;
            }
            await guildMember.roles.add(newRole).catch((err) => {
                logger.error('Error while adding role', {guildID});
                logger.error(err);
            });
            logger.info(`Added role to ${guildMember.user.tag}: ${newRole.name}`);
        }
    }
}
