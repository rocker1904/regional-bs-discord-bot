import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import Bot from '../Bot';
import Command from './Command';

export default class RoleUpdateCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('role-update')
        .setDescription('Manually runs a role update')
        .setDefaultMemberPermissions(0);

    public async execute(interaction: CommandInteraction) {
        void Bot.roleUpdater.main();
        await interaction.reply('Running update.');
    }
}
