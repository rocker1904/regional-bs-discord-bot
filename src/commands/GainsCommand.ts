import {CommandInteraction, EmbedBuilder, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import scoreSaber from '../util/scoreSaber';
import safeReply from '../util/safeReply';
import dateDiff from '../util/dateDiff';
import {GainsCommandData} from '../entity/GainsCommandData';
import logger from '../util/logger';

export default class GainsCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('gains')
        .setDescription('Returns the PP and Rank change since last using the command.');

    public async execute(interaction: CommandInteraction) {
        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}, relations: {gainsData: true}});
        if (!guildUser) {
            await safeReply(interaction, {content: Strings.NO_USER, ephemeral: true});
            return;
        }

        // Get the user's ScoreSaber
        const player = await scoreSaber.players.getBasic(guildUser.scoreSaberID).catch((err) => {
            logger.error('Gains command failed. Error fetching player.');
            logger.error(err);
            void safeReply(interaction, {content: 'Command failed. Error fetching data from ScoreSaber', ephemeral: true});
        });
        if (!player) return;
        const gainsData = guildUser.gainsData;

        if (!gainsData) {
            const newGainsData = new GainsCommandData();
            newGainsData.globalRank = player.stats.rank;
            newGainsData.time = new Date();
            newGainsData.pp = player.stats.totalPP;
            await newGainsData.save();
            guildUser.gainsData = newGainsData;
            await guildUser.save();
            await safeReply(interaction, {
                content: 'Baseline recorded! Run `/gains` again later to see your PP and rank change.',
                ephemeral: true,
            });
            return;
        } else {
            // Get the change
            const globalRankChange = Math.abs(player.stats.rank - gainsData.globalRank);
            const ppChange = Math.abs(player.stats.totalPP - gainsData.pp);

            let description = '';
            let color = 0x99aab5; // grey: no PP change
            if (player.stats.totalPP > gainsData.pp) {
                description += `You **gained ${ppChange.toFixed(2)}PP** in the last ${dateDiff(gainsData.time)}`;
                color = 0x57f287; // green
            } else if (gainsData.pp > player.stats.totalPP) {
                description += `You **lost ${ppChange.toFixed(2)}PP** in the last ${dateDiff(gainsData.time)}`;
                color = 0xed4245; // red
            } else {
                description += `Your PP has **stayed the same** in the last ${dateDiff(gainsData.time)}`;
            }

            if (player.stats.rank > gainsData.globalRank) {
                description += ` (and **lost ${globalRankChange}** ranks)`;
            } else if (player.stats.rank < gainsData.globalRank) {
                description += ` (and **gained ${globalRankChange}** ranks)`;
            } else {
                description += ` (and **stayed the same** rank)`;
            }

            const embed = new EmbedBuilder().setColor(color).setTitle('Your gains').setThumbnail(player.avatar).setDescription(description);
            await safeReply(interaction, {embeds: [embed]});

            // Update Gains Data
            gainsData.globalRank = player.stats.rank;
            gainsData.time = new Date();
            gainsData.pp = player.stats.totalPP;
            await gainsData.save();
        }
    }
}
