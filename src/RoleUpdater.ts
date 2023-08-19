import ScoresaberAPI from './api/scoresaber';
import {Player} from './api/scoresaber/types/PlayerData';
import Bot from './Bot';
import {rankUpdateInterval, guildConfigs} from './config.json';
import {GuildUser} from './entity/GuildUser';
import logger from './util/logger';

type Dict = {[key: string]: string};

export default class RoleUpdater {
    private timer!: NodeJS.Timeout;
    private stopped = true;

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

    public async main() {
        logger.debug('Running role update');
        for (const {regionRankGroups, globalRankGroups, scoreSaberRegions, guildID} of guildConfigs) {
            // Update region ranks
            const lastRegionRankGroup = regionRankGroups.at(-1);
            if (lastRegionRankGroup) {
                const scoreSaberRegion = scoreSaberRegions.join(',');
                const regionalPlayers = await ScoresaberAPI.fetchPlayersUnderRank(lastRegionRankGroup.rank, scoreSaberRegion).catch((err) => {
                    logger.error('Regional role update failed. Error fetching players.');
                    logger.error(err);
                });
                if (!regionalPlayers) return;
                await this.updateRankRolesOrdered(regionalPlayers, regionRankGroups, guildID, true);
            }

            // Update global ranks
            const lastGlobalRankGroup = globalRankGroups.at(-1);
            if (lastGlobalRankGroup) { // Won't run if globalRankGroups is empty
                const globalPlayers = await ScoresaberAPI.fetchPlayersUnderRank(lastGlobalRankGroup.rank).catch((err) => {
                    logger.error('Global role update failed. Error fetching players.');
                    logger.error(err);
                });
                if (!globalPlayers) return;
                await this.updateRankRoles(globalPlayers, globalRankGroups, guildID);
            }
        }
        logger.debug('Role update complete');
    }

    public async updateRankRoles(players: Player[], rankGroups: RankGroup[], guildID: string, regional = false): Promise<void> {
        for (const player of players) {
            await RoleUpdater.updateRankRole(player, rankGroups, guildID, regional);
        }
    }

    // For multiple regions at the same time (ie. AU and NZ for OCE), all players need to be fetched and the indicies used to determine rank
    public async updateRankRolesOrdered(players: Player[], rankGroups: RankGroup[], guildID: string, regional = false): Promise<void> {
        let rank = 1;
        for (const player of players) {
            await RoleUpdater.updateRankRole(player, rankGroups, guildID, regional, rank);
            rank++;
        }
    }

    public static async updateRankRole(player: Player, rankGroups: RankGroup[], guildID: string, regional = false, rankOverride?: number): Promise<void> {
        // Get the Discord ID of the player with this ScoreSaber profile from the database
        const guildUser = await GuildUser.findOne({where: {scoreSaberID: player.id}});
        if (!guildUser) return;

        // Fetch their GuildMember object
        const guildMember = await Bot.guilds[guildID].members.fetch(guildUser.discordID).catch(() => {
            // If member can't be found, we can ignore the error here, it's handled below
        });

        if (!guildMember) return;
        const playerRank = rankOverride || (regional ? player.countryRank : player.rank);

        // Work out which rank group they fall under
        let playerRankGroup: RankGroup | undefined;
        for (const rankGroup of rankGroups) {
            if (rankGroup.rank >= playerRank) {
                playerRankGroup = rankGroup;
                break;
            }
        }

        if (player.rank === 0) playerRankGroup = undefined; // Handles inactive accounts

        // Remove rank roles the player shouldn't have
        for (const rankGroup of rankGroups) {
            if (guildMember.roles.cache.some((role) => role.id === rankGroup.roleID) && rankGroup.roleID !== playerRankGroup?.roleID) {
                const removedRole = Bot.guilds[guildID].roles.resolve(rankGroup.roleID);
                if (!removedRole) {
                    logger.error(`Can't find rank role for ${rankGroup.roleID} with rank ${rankGroup.rank}`, {guildID});
                    continue;
                }
                await guildMember.roles.remove(removedRole).catch((err) => {
                    logger.error('Error while removing roles', {guildID});
                    logger.error(err);
                });
                logger.info(`Removed role in ${Bot.guilds[guildID].name} from ${guildMember.user.tag}: ${removedRole.name}`);
            }
        }

        // If no player rank group, no need to add a role
        if (!playerRankGroup) return;

        // Add their current rank role if they don't already have it
        if (!guildMember.roles.cache.some((role) => role.id === playerRankGroup!.roleID)) {
            const newRole = Bot.guilds[guildID].roles.resolve(playerRankGroup.roleID);
            if (!newRole) {
                logger.error(`Can't find rank role for ${playerRankGroup.roleID} with rank ${playerRankGroup.rank}`, {guildID});
                return;
            }
            await guildMember.roles.add(newRole).catch((err) => {
                logger.error('Error while adding role', {guildID});
                logger.error(err);
            });
            logger.info(`Added role in ${Bot.guilds[guildID].name} to ${guildMember.user.tag}: ${newRole.name}`);
            if (Bot.rankupFeedChannels[guildID]) {
                await Bot.rankupFeedChannels[guildID].send(`${guildMember.displayName} has advanced to ${newRole.name}`);
            }
        }
    }

    public static async updateRegionRole(guildUser: GuildUser, guildID: string) {
        // Fetch their GuildMember object
        const guildMember = await Bot.guilds[guildID].members.fetch(guildUser.discordID).catch(() => {
            // If member can't be found, we can ignore the error here, it's handled below
        });

        if (!guildMember) return;

        const player = await ScoresaberAPI.fetchBasicPlayer(guildUser.scoreSaberID).catch((err) => {
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
