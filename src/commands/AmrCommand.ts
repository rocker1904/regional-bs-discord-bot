import {CommandInteraction, EmbedBuilder, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import rankNeighbours from '../util/rankNeighbours';
import scoreSaber from '../util/scoreSaber';
import safeReply from '../util/safeReply';
import countryFlag from '../util/countryFlag';
import logger from '../util/logger';

export default class AmrCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('amr')
        .setDescription('Returns the pp diff between you and the people around you in your region.');

    public async execute(interaction: CommandInteraction) {
        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}});

        if (!guildUser) {
            await safeReply(interaction, {content: Strings.NO_USER, ephemeral: true});
            return;
        }

        // Get data for profiles around the user (both neighbours in one request)
        const player = await scoreSaber.players.getBasic(guildUser.scoreSaberID);
        const {above: playerAbove, below: playerBelow} = await rankNeighbours(player.stats.countryRank, {
            countries: player.country,
        }).catch(async (err) => {
            logger.error('amr command failed.');
            logger.error(err);
            await safeReply(interaction, {content: 'Command failed. Error fetching data from ScoreSaber', ephemeral: true});
            return {above: undefined, below: undefined};
        });
        if (!playerBelow) return;

        let description: string;
        if (player.stats.countryRank === 1) {
            description = `You're ${player.country} #1! 🥇 ${(player.stats.totalPP - playerBelow.stats.totalPP).toFixed(2)}PP above **${playerBelow.name}**.`;
        } else {
            if (!playerAbove) return;
            description = `#${playerAbove.stats.countryRank} **${playerAbove.name}** has ${(playerAbove.stats.totalPP - player.stats.totalPP).toFixed(2)} more PP than you.
#${player.stats.countryRank} **You (${player.name})** have ${player.stats.totalPP}PP.
#${playerBelow.stats.countryRank} **${playerBelow.name}** has ${(player.stats.totalPP - playerBelow.stats.totalPP).toFixed(2)} less PP than you.`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle(`${countryFlag(player.country)} ${player.country} ranks around you`.trim())
            .setThumbnail(player.avatar)
            .setDescription(description);
        await safeReply(interaction, {embeds: [embed]});
    }
}
