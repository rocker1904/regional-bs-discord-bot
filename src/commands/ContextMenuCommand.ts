import {ContextMenuCommandBuilder, UserContextMenuCommandInteraction} from 'discord.js';

/** A right-click "Apps" command that targets a user (separate from slash Commands). */
export default interface ContextMenuCommand {
    builder: ContextMenuCommandBuilder;
    execute(interaction: UserContextMenuCommandInteraction): Promise<void>;
}
