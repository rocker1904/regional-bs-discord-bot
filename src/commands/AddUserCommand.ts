import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import extractScoreSaberID from '../util/extractScoreSaberID';
import Command from './Command';
import Strings from '../util/Strings';
import RoleUpdater from '../RoleUpdater';

export default class AddUserCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('add-user')
        .setDescription('Adds a user to the database.')
        .setDefaultMemberPermissions(0)
        .addUserOption((option) =>
            option.setName('user')
                .setDescription('User to add')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName('scoresaber')
                .setDescription('ScoreSaber Link or ID')
                .setRequired(true),
        );

    public async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        const user = interaction.options.getUser('user')!; // Required options so should be safe to assert not null
        const scoreSaber = interaction.options.getString('scoresaber')!;

        // Test if given an invalid ScoreSaber ID
        const scoreSaberID = extractScoreSaberID(scoreSaber);
        if (scoreSaberID === null) {
            await interaction.reply(Strings.INVALID_PROFILE);
            return;
        }

        // Test if the user is already in the database
        if (await GuildUser.findOne({where: {discordID: user.id}})) {
            await interaction.reply(Strings.USER_ALREADY_REGISTERED);
            return;
        }

        // Test if the ScoreSaber profile is already in the database
        if (await GuildUser.findOne({where: {scoreSaberID: scoreSaberID}})) {
            await interaction.reply(Strings.PROFILE_ALREADY_REGISTERED);
            return;
        }

        const guildUser = new GuildUser();
        guildUser.discordID = user.id;
        guildUser.scoreSaberID = scoreSaberID;
        await guildUser.save();
        if (interaction.guildId) await RoleUpdater.updateRegionRole(guildUser, interaction.guildId);
        await interaction.reply(Strings.REGISTRATION_SUCCESS);
    }
}
