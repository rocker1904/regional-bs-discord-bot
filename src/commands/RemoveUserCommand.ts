import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';

export default class RemoveUserCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('remove-user')
        .setDescription('Removes a user from the database.')
        .setDefaultMemberPermissions(0)
        .addUserOption((option) =>
            option.setName('user')
                .setDescription('User to remove')
                .setRequired(true),
        );

    public async execute(interaction: CommandInteraction) {
        const user = interaction.options.getUser('user')!; // Required options so should be safe to assert not null

        const guildUser = await GuildUser.findOne({where: {discordID: user.id}});
        if (!guildUser) {
            await interaction.reply(Strings.NO_USER);
            return;
        }

        await guildUser.remove();
        await interaction.reply(Strings.USER_REMOVAL_SUCCESS);
    }
}
