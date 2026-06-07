import {CommandInteraction, Interaction} from 'discord.js';
import commands from '../commands';
import contextMenuCommands from '../commands/contextMenu';
import logger from '../util/logger';
import safeReply from '../util/safeReply';

// Most commands reply well within Discord's 3s interaction window, so we let them
// reply directly. If a handler is still working after this long, we auto-defer to
// keep the token alive; safeReply lets the handler respond either way.
const AUTO_DEFER_MS = 2000;

export default async function onInteraction(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
        const command = commands.find((c) => c.slashCommandBuilder.name === interaction.commandName);
        if (command) await runWithSafetyNet(interaction, () => command.execute(interaction));
    } else if (interaction.isUserContextMenuCommand()) {
        const command = contextMenuCommands.find((c) => c.builder.name === interaction.commandName);
        if (command) await runWithSafetyNet(interaction, () => command.execute(interaction));
    }
}

// Runs a command handler with the auto-defer safety net and a catch-all error reply.
async function runWithSafetyNet(interaction: CommandInteraction, run: () => Promise<void>): Promise<void> {
    const autoDefer = setTimeout(() => {
        if (!interaction.replied && !interaction.deferred) {
            interaction.deferReply().catch((err) => {
                logger.error(`Auto-defer failed for '${interaction.commandName}'`);
                logger.error(err);
            });
        }
    }, AUTO_DEFER_MS);

    try {
        await run();
    } catch (err) {
        logger.error(`Command '${interaction.commandName}' threw an uncaught error`);
        logger.error(err);
        await safeReply(interaction, 'Something went wrong running that command.').catch(() => {
            // If even the error reply fails (e.g. expired token) there's nothing more to do.
        });
    } finally {
        clearTimeout(autoDefer);
    }
}
