import {SlashCommandBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';

export default class UnregisterCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('unregister')
        .setDescription('Unregister from the bot');

    public permissions = [];

    public async execute(interaction: CommandInteraction) {
        const user = interaction.user;

        // Test if the user is already in the database
        const guildUser = await GuildUser.findOne(user.id);
        if (guildUser) {
            await guildUser.remove();
            await interaction.reply(Strings.USER_REMOVAL_SUCCESS);
            return;
        } else {
            await interaction.reply(Strings.NO_USER);
            return;
        }
    }
}
