import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import Bot from '../Bot';
import Command from './Command';
import safeReply from '../util/safeReply';

export default class RoleUpdateCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('role-update')
        .setDescription('Manually runs a role update')
        .setDefaultMemberPermissions(0);

    public async execute(interaction: CommandInteraction) {
        // The run can take a while; the dispatcher auto-defers past 2s. Awaiting it
        // means errors surface and we can report the outcome (the guard returns false
        // if a run — e.g. the interval — is already in progress).
        const ran = await Bot.roleUpdater.main();
        await safeReply(interaction, {
            content: ran ? 'Role update complete.' : 'A role update is already running — try again shortly.',
            ephemeral: true,
        });
    }
}
