import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import ScoresaberAPI from '../api/scoresaber';
import {scoresaberRegion} from '../config.json';

export default class AmrCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('amr')
        .setDescription('Returns the pp diff between you and the people around you in your region.');

    public async execute(interaction: CommandInteraction) {
        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}});

        if (!guildUser) {
            await interaction.reply(Strings.NO_USER);
            return;
        }

        // Get data for profiles around the user
        const player = await ScoresaberAPI.fetchBasicPlayer(guildUser.scoreSaberID);
        const playerBelow = await ScoresaberAPI.fetchPlayerByRank(player.countryRank + 1, player.country);

        if (player.rank === 1) {
            await interaction.reply(`You are ${(player.pp - playerBelow.pp).toFixed(2)}PP above ${playerBelow.name}`);
            return;
        }

        const playerAbove = await ScoresaberAPI.fetchPlayerByRank(player.countryRank - 1, player.country);

        const reply = `__**${scoresaberRegion.toUpperCase()} ranks around you:**__
#${playerAbove.countryRank} **${playerAbove.name}** has ${(playerAbove.pp - player.pp).toFixed(2)} more PP than you.
#${player.countryRank} **You (${player.name})** have ${player.pp}PP.
#${playerBelow.countryRank} **${playerBelow.name}** has ${(player.pp - playerBelow.pp).toFixed(2)} less PP than you.`;

        await interaction.reply(reply);
    }
}
