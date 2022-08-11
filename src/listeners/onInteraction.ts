import {Interaction, InteractionType} from 'discord.js';
import commands from '../commands';

export default async function onInteraction(interaction: Interaction): Promise<void> {
    if (interaction.type !== InteractionType.ApplicationCommand) return;

    const {commandName} = interaction;
    const command = commands.find((c) => c.slashCommandBuilder.name == commandName);

    if (!command) return;

    await command.execute(interaction);
}
