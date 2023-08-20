import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import Bot from '../Bot';
import Command from './Command';

export default class ProgressReportCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('progress-report')
        .setDescription('Manually prints the progress report')
        .setDefaultMemberPermissions(0);

    public async execute(interaction: CommandInteraction) {
        void Bot.progressReport.main();
        await interaction.reply('Running progress report.');
    }
}
