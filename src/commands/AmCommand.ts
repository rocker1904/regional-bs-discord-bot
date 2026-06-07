import {CommandInteraction, EmbedBuilder, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import scoreSaber from '../util/scoreSaber';
import rankNeighbours from '../util/rankNeighbours';
import safeReply from '../util/safeReply';
import logger from '../util/logger';

export default class AmCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('am')
        .setDescription('Returns the pp diff between you and the people around you.');

    public async execute(interaction: CommandInteraction) {
        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}});

        if (!guildUser) {
            await safeReply(interaction, {content: Strings.NO_USER, ephemeral: true});
            return;
        }

        // Get data for profiles around the user (both neighbours in one request)
        const player = await scoreSaber.players.getBasic(guildUser.scoreSaberID);
        const {above: playerAbove, below: playerBelow} = await rankNeighbours(player.stats.rank).catch(async (err) => {
            logger.error('Am command failed. Error fetching surrounding players.');
            logger.error(err);
            await safeReply(interaction, {content: 'Command failed. Error fetching data from ScoreSaber', ephemeral: true});
            return {above: undefined, below: undefined};
        });
        if (!playerBelow) return;

        let description: string;
        if (player.stats.rank === 1) {
            description = `You're #1! 🥇 ${(player.stats.totalPP - playerBelow.stats.totalPP).toFixed(2)}PP above **${playerBelow.name}**.`;
        } else {
            if (!playerAbove) return;
            description = `#${playerAbove.stats.rank} **${playerAbove.name}** has ${(playerAbove.stats.totalPP - player.stats.totalPP).toFixed(2)} more PP than you.
#${player.stats.rank} **You (${player.name})** have ${player.stats.totalPP}PP.
#${playerBelow.stats.rank} **${playerBelow.name}** has ${(player.stats.totalPP - playerBelow.stats.totalPP).toFixed(2)} less PP than you.`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle('Global ranks around you')
            .setThumbnail(player.avatar)
            .setDescription(description);
        await safeReply(interaction, {embeds: [embed]});
    }
}
