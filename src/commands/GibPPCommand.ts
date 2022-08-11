import {SlashCommandBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';
import Command from './Command';

export default class GibPPCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('gib-pp')
        .setDescription('Free PP.')

    public async execute(interaction: CommandInteraction) {
        // Gibbing the P of P's
        const reply = `https://scoresaber.balibalo.xyz/peepee`
        await interaction.reply(reply);
    }
}