import {ChannelType, CommandInteraction, SlashCommandBuilder} from 'discord.js';
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
        .addSubcommand((s) =>
            s
                .setName('run')
                .setDescription('Run the progress report now')
                .addChannelOption((o) =>
                    o
                        .setName('channel')
                        .setDescription('Post to this channel instead of the configured one')
                        .addChannelTypes(ChannelType.GuildText),
                ),
        )
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
            case 'run': {
                const picked = interaction.options.getChannel('channel');
                const target = picked ? interaction.guild?.channels.cache.get(picked.id) : Bot.progressReportChannels[guildID];
                if (!target || target.type !== ChannelType.GuildText) {
                    await interaction.reply(
                        'I can only post the report to a text channel — pick one, or set a progress report channel in the config.',
                    );
                    return;
                }
                await interaction.reply(`Running the progress report — images will post to <#${target.id}>.`);
                void Bot.progressReport.runGuild(guildID, target).catch((err) => {
                    logger.error('Manual progress report run failed', {guildID});
                    logger.error(err);
                });
                return;
            }
            case 'enable':
            case 'disable': {
                const enabled = interaction.options.getSubcommand() === 'enable';
                const row =
                    (await ProgressReportState.findOneBy({guildID})) ?? ProgressReportState.create({guildID, enabled, lastRunAt: null});
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
