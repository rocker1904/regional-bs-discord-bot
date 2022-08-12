import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import Command from './Command';

export default class PongCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('pong')
        .setDescription('Replies with Ping!');

    public async execute(interaction: CommandInteraction) {
        await interaction.reply('Ping!');
    }
}
