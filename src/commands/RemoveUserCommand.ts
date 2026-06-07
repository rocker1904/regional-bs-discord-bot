import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import safeReply from '../util/safeReply';

export default class RemoveUserCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('remove-user')
        .setDescription('Removes a user from the database.')
        .setDefaultMemberPermissions(0)
        .addUserOption((option) => option.setName('user').setDescription('User to remove').setRequired(true));

    public async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        const user = interaction.options.getUser('user')!; // Required options so should be safe to assert not null

        const guildUser = await GuildUser.findOne({where: {discordID: user.id}});
        if (!guildUser) {
            await safeReply(interaction, {content: Strings.NO_USER, ephemeral: true});
            return;
        }

        await guildUser.remove();
        await safeReply(interaction, Strings.USER_REMOVAL_SUCCESS);
    }
}
