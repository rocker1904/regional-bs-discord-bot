import ScoresaberAPI from './api/scoresaber';
import {Player} from './api/scoresaber/types/PlayerData';
import Bot from './Bot';
import {regionRankGroups, globalRankGroups, scoresaberRegion, interval, roleMap} from './config.json';
import {GuildUser} from './entity/GuildUser';
import logger from './util/logger';

type Dict = {[key: string]: string};

export default class RoleUpdater {
    private timer!: NodeJS.Timeout;
    private stopped = true;

    constructor() {
        regionRankGroups.sort((a, b) => a.rank - b.rank);
        globalRankGroups.sort((a, b) => a.rank - b.rank);
        this.start();
    }

    public start() {
        if (this.stopped) {
            this.timer = setInterval(() => void this.main(), interval * 1000 * 60);
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

    private async main() {
        // Update region ranks
        const finalregionRankGroup = regionRankGroups.at(-1);
        if (!finalregionRankGroup) return;
        const regionalPlayers = await ScoresaberAPI.getPlayersUnderRank(finalregionRankGroup.rank, scoresaberRegion);
        await this.updateRankRoles(regionalPlayers, regionRankGroups, true);

        // Update global ranks
        const finalGlobalRankGroup = globalRankGroups.at(-1);
        if (!finalGlobalRankGroup) return;
        const globalPlayers = await ScoresaberAPI.getPlayersUnderRank(finalGlobalRankGroup.rank);
        await this.updateRankRoles(globalPlayers, globalRankGroups);
    }

    private async updateRankRoles(players: Player[], rankGroups: RankGroup[], regional = false): Promise<void> {
        for (const player of players) {
            await RoleUpdater.updateRankRole(player, rankGroups, regional);
        }
    }

    public static async updateRankRole(player: Player, rankGroups: RankGroup[], regional = false): Promise<void> {
        // Request the Discord ID of the individual with this ScoreSaber profile from the database
        const guildUser = await GuildUser.findOne({where: {scoreSaberID: player.id}});
        if (!guildUser) return;

        // Fetch their GuildMember object
        const guildMember = await Bot.guild.members.fetch(guildUser.discordID).catch(() => {
            // If member can't be found, we can ignore the error here, it's handled below
        });

        if (!guildMember) {
            if (!guildUser.hasLeftServer) { // If this is the first time we've noticed they're missing, send a message
                logger.notice(`Someone left the server`);
                logger.notice(`Discord ID: ${guildUser.discordID}\nScoreSaber ID: ${guildUser.scoreSaberID}`);
                guildUser.hasLeftServer = true;
                await guildUser.save();
            }
            return;
        }

        if (guildUser.hasLeftServer && guildMember) {
            guildUser.hasLeftServer = false;
            await guildUser.save();
        }
        const playerRank = regional ? player.countryRank : player.rank;

        // Work out which rank group they fall under
        let playerRankGroup: RankGroup | undefined;
        for (const rankGroup of rankGroups) {
            if (rankGroup.rank >= playerRank) {
                playerRankGroup = rankGroup;
                break;
            }
        }

        if (player.rank === 0) playerRankGroup = undefined;

        // Remove rank roles the player shouldn't have
        for (const rankGroup of rankGroups) {
            if (guildMember.roles.cache.some((role) => role.id === rankGroup.roleID) && rankGroup !== playerRankGroup) {
                const removedRole = Bot.guild.roles.resolve(rankGroup.roleID);
                if (!removedRole) {
                    logger.error(`Can't find rank role for ${rankGroup.roleID} with rank ${rankGroup.rank}`);
                    continue;
                }
                await guildMember.roles.remove(removedRole).catch((err) => {
                    logger.error('Error while removing roles');
                    logger.error(err);
                });
                logger.info(`Removed role from ${guildMember.user.tag}: ${removedRole.name}`);
            }
        }

        // If no player rank group, no need to add a role
        if (!playerRankGroup) return;

        // Add their current rank role if they don't already have it
        if (!guildMember.roles.cache.some((role) => role.id === playerRankGroup!.roleID)) {
            const newRole = Bot.guild.roles.resolve(playerRankGroup.roleID);
            if (!newRole) {
                logger.error(`Can't find rank role for ${playerRankGroup.roleID} with rank ${playerRankGroup.rank}`);
                return;
            }
            await guildMember.roles.add(newRole).catch((err) => {
                logger.error('Error while adding role');
                logger.error(err);
            });
            logger.info(`Added role to ${guildMember.user.tag}: ${newRole.name}`);
        }
    }

    public static async updateRegionRole(guildUser: GuildUser) {
        // Fetch their GuildMember object
        const guildMember = await Bot.guild.members.fetch(guildUser.discordID).catch(() => {
            // If member can't be found, we can ignore the error here, it's handled below
        });

        if (!guildMember) {
            if (!guildUser.hasLeftServer) { // If this is the first time we've noticed they're missing, send a message
                logger.notice(`Someone left the server`);
                logger.notice(`Discord ID: ${guildUser.discordID}\nScoreSaber ID: ${guildUser.scoreSaberID}`);
                guildUser.hasLeftServer = true;
                await guildUser.save();
            }
            return;
        }

        if (guildUser.hasLeftServer && guildMember) {
            guildUser.hasLeftServer = false;
            await guildUser.save();
        }

        const player = await ScoresaberAPI.getPlayerByID(guildUser.scoreSaberID);

        const roleID = (roleMap as Dict)[player.country.toLowerCase()] || (roleMap as Dict)[''];

        // Add their region role if they don't already have it
        if (!guildMember.roles.cache.some((role) => role.id === roleID)) {
            const newRole = Bot.guild.roles.resolve(roleID);
            if (!newRole) {
                logger.error(`Can't find region role for ${roleID} with region ${player.country}`);
                return;
            }
            await guildMember.roles.add(newRole).catch((err) => {
                logger.error('Error while adding role');
                logger.error(err);
            });
            logger.info(`Added role to ${guildMember.user.tag}: ${newRole.name}`);
        }
    }
}
