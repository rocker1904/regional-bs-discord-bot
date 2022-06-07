import {SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';

export default interface Command {
    slashCommandBuilder: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> | SlashCommandSubcommandsOnlyBuilder;
    execute(interaction: CommandInteraction): Promise<void>;
}
