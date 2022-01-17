import {SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder} from '@discordjs/builders';
import {ApplicationCommandPermissionData, CommandInteraction} from 'discord.js';

export default interface Command {
    slashCommandBuilder: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> | SlashCommandSubcommandsOnlyBuilder;
    permissions: ApplicationCommandPermissionData[];
    execute(interaction: CommandInteraction): Promise<void>;
}
