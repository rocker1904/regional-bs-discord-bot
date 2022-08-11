import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import Command from './Command';

export default class PingCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!');

    public async execute(interaction: CommandInteraction) {
        await interaction.reply('Pong!');
    }
}
