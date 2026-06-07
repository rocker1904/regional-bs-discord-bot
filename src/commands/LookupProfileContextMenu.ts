import {ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, UserContextMenuCommandInteraction} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import ContextMenuCommand from './ContextMenuCommand';
import scoreSaber from '../util/scoreSaber';
import safeReply from '../util/safeReply';
import countryFlag from '../util/countryFlag';
import logger from '../util/logger';

// Right-click a member ▸ Apps ▸ "ScoreSaber profile" — shows their rank/PP (ephemeral).
export default class LookupProfileContextMenu implements ContextMenuCommand {
    public builder = new ContextMenuCommandBuilder().setName('ScoreSaber profile').setType(ApplicationCommandType.User);

    public async execute(interaction: UserContextMenuCommandInteraction): Promise<void> {
        const target = interaction.targetUser;
        const guildUser = await GuildUser.findOne({where: {discordID: target.id}});
        if (!guildUser) {
            await safeReply(interaction, {content: `${target.username} hasn't registered a ScoreSaber profile.`, ephemeral: true});
            return;
        }

        const player = await scoreSaber.players.getBasic(guildUser.scoreSaberID).catch((err) => {
            logger.error('Profile lookup failed. Error fetching player.');
            logger.error(err);
            void safeReply(interaction, {content: 'Command failed. Error fetching data from ScoreSaber', ephemeral: true});
        });
        if (!player) return;

        const embed = new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle(`${countryFlag(player.country)} ${player.name}`.trim())
            .setURL(`https://scoresaber.com/u/${player.id}`)
            .setThumbnail(player.avatar)
            .addFields(
                {name: 'Global Rank', value: `#${player.stats.rank.toLocaleString('en-US')}`, inline: true},
                {name: `${player.country} Rank`, value: `#${player.stats.countryRank.toLocaleString('en-US')}`, inline: true},
                {name: 'PP', value: `${Math.round(player.stats.totalPP).toLocaleString('en-US')}pp`, inline: true},
            );
        await safeReply(interaction, {embeds: [embed], ephemeral: true});
    }
}
