import {SlashCommandBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';
import {ApplicationCommandPermissionTypes as PermissionTypes} from 'discord.js/typings/enums';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import {staffRoleID} from '../config.json';

export default class RemoveUserCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('remove-user')
        .setDescription('Removes a user from the database.')
        .setDefaultPermission(false)
        .addUserOption((option) =>
            option.setName('user')
                .setDescription('User to remove')
                .setRequired(true),
        );

    public permissions = [{
        id: staffRoleID,
        type: PermissionTypes.ROLE,
        permission: true,
    }];

    public async execute(interaction: CommandInteraction) {
        const user = interaction.options.getUser('user')!; // Required options so should be safe to assert not null

        const guildUser = await GuildUser.findOne(user.id);
        if (!guildUser) {
            await interaction.reply(Strings.NO_USER);
            return;
        }

        await guildUser.remove();
        await interaction.reply(Strings.USER_REMOVAL_SUCCESS);
    }
}
