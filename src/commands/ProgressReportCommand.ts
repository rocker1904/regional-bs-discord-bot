import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import Bot from '../Bot';
import Command from './Command';
import logger from '../util/logger';
import {guildConfigs} from '../config';
import {ProgressReportState} from '../entity/ProgressReportState';
import {statusLine} from '../progress-report/statusLine';

export default class ProgressReportCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('progress-report')
        .setDescription('Manage the regional progress report')
        .setDefaultMemberPermissions(0)
        .addSubcommand((s) => s.setName('run').setDescription('Run the progress report now'))
        .addSubcommand((s) => s.setName('enable').setDescription('Enable the monthly progress report'))
        .addSubcommand((s) => s.setName('disable').setDescription('Disable the monthly progress report'))
        .addSubcommand((s) => s.setName('status').setDescription('Show progress report status'));

    public async execute(interaction: CommandInteraction): Promise<void> {
        if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;
        const guildID = interaction.guildId;

        const configured = guildConfigs.find((g) => g.guildID === guildID)?.progressReportConfig;
        if (!configured) {
            await interaction.reply('No progress report is configured for this server.');
            return;
        }

        switch (interaction.options.getSubcommand()) {
            case 'run':
                await interaction.reply('Running the progress report — images will post to the configured channel.');
                void Bot.progressReport.runGuild(guildID).catch((err) => {
                    logger.error('Manual progress report run failed', {guildID});
                    logger.error(err);
                });
                return;
            case 'enable':
            case 'disable': {
                const enabled = interaction.options.getSubcommand() === 'enable';
                const row = (await ProgressReportState.findOneBy({guildID})) ?? ProgressReportState.create({guildID, enabled, lastRunAt: null});
                row.enabled = enabled;
                await row.save();
                await interaction.reply(`Monthly progress report **${enabled ? 'enabled' : 'disabled'}**.`);
                return;
            }
            case 'status': {
                const state = await ProgressReportState.findOneBy({guildID});
                await interaction.reply(statusLine(state?.enabled ?? false, state?.lastRunAt ?? null, new Date()));
                return;
            }
        }
    }
}
