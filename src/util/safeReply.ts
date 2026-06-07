import {CommandInteraction, EmbedBuilder, MessageFlags} from 'discord.js';

export interface SafeReplyOptions {
    content?: string;
    embeds?: EmbedBuilder[];
    /** Show the reply only to the invoking user. Ignored once the interaction is already (auto-)deferred. */
    ephemeral?: boolean;
}

/**
 * Responds to a command interaction whether or not it has already been deferred.
 *
 * Command handlers reply directly in the fast path; if a handler is slow, the
 * dispatcher (see `listeners/onInteraction`) auto-defers the interaction to keep
 * its token alive. Routing replies through here means the same handler code works
 * in both cases — a direct `reply` when fresh, an `editReply` once deferred.
 *
 * Pass a string for a plain public reply, or an options object for embeds /
 * ephemeral. Ephemeral only takes effect on a fresh reply: a reply can't be made
 * ephemeral after the auto-defer has already acknowledged it publicly, so reserve
 * it for fast paths (validation/errors before any slow API call).
 */
export default async function safeReply(interaction: CommandInteraction, payload: string | SafeReplyOptions): Promise<void> {
    const opts: SafeReplyOptions = typeof payload === 'string' ? {content: payload} : payload;
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({content: opts.content, embeds: opts.embeds});
    } else {
        await interaction.reply({
            content: opts.content,
            embeds: opts.embeds,
            flags: opts.ephemeral ? MessageFlags.Ephemeral : undefined,
        });
    }
}
