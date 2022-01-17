import {Interaction} from 'discord.js';
import commands from '../commands';

export default async function onInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;

    const {commandName} = interaction;
    const command = commands.find((c) => c.slashCommandBuilder.name == commandName);

    if (!command) return;

    await command.execute(interaction);
}
