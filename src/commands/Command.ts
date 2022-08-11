import {CommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder} from 'discord.js';

export default interface Command {
    slashCommandBuilder: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> | SlashCommandSubcommandsOnlyBuilder;
    execute(interaction: CommandInteraction): Promise<void>;
}
