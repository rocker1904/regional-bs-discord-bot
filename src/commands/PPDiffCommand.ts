import {SlashCommandBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import ScoresaberAPI from '../api/scoresaber';
import extractScoreSaberID from '../util/extractScoreSaberID';

export default class PPDiffCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('pp-diff')
        .setDescription('Returns the difference in PP between you and a given player.')
        .addUserOption((option) =>
            option.setName('player')
                .setDescription('Player to compare difference in PP.')
                .setRequired(true),
        )
        
    public async execute(interaction: CommandInteraction) {

        // Fetch user from db
        const guildUser = await GuildUser.findOne(interaction.user.id);
        const targetUser = await GuildUser.findOne(interaction.options.getUser('player')?.id)

        if (!guildUser || !targetUser) {
            await interaction.reply(Strings.NO_USER);
            return;
        }

        // Get data for user profile and given profile
        const player = await ScoresaberAPI.getPlayerByID(guildUser.scoreSaberID);
        const targetPlayer = await ScoresaberAPI.getPlayerByID(targetUser.scoreSaberID);
        var reply = "";

        const PPDiff = Math.abs(targetPlayer.pp - player.pp).toFixed(2);

        // If user is higher then given player.
        if(targetPlayer.pp > player.pp) {
            reply += `${targetPlayer.name} has  ${PPDiff} more PP than you.`;
        } else if(player.pp > targetPlayer.pp) {
            reply += `You have ${PPDiff} more PP than ${targetPlayer.name}.`;
        } else {
            reply += `You have the same PP as ${targetPlayer.name}.`;
        }

        await interaction.reply(reply);
    }
}