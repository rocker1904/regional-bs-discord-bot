import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import RoleUpdater from '../RoleUpdater';
import extractScoreSaberID from '../util/extractScoreSaberID';
import Strings from '../util/Strings';
import safeReply from '../util/safeReply';
import isUniqueViolation from '../util/isUniqueViolation';
import Command from './Command';

export default class RegisterCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register with the bot')
        .addStringOption((option) => option.setName('scoresaber').setDescription('ScoreSaber Link or ID').setRequired(true));

    public async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        const user = interaction.user;
        const scoreSaber = interaction.options.getString('scoresaber')!; // Required option so should be safe to assert not null

        // Test if given an invalid ScoreSaber ID
        const scoreSaberID = extractScoreSaberID(scoreSaber);
        if (scoreSaberID === null) {
            await safeReply(interaction, {content: Strings.INVALID_PROFILE, ephemeral: true});
            return;
        }

        // Test if the ScoreSaber profile is already in the database
        if (await GuildUser.findOne({where: {scoreSaberID: scoreSaberID}})) {
            await safeReply(interaction, {content: Strings.PROFILE_ALREADY_REGISTERED, ephemeral: true});
            return;
        }

        // Test if the user is already in the database
        if (await GuildUser.findOne({where: {discordID: user.id}})) {
            await safeReply(interaction, {content: Strings.USER_ALREADY_REGISTERED, ephemeral: true});
            return;
        }

        const guildUser = new GuildUser();
        guildUser.discordID = user.id;
        guildUser.scoreSaberID = scoreSaberID;
        try {
            await guildUser.save();
        } catch (err) {
            // A concurrent register can slip past the checks above and trip the unique constraint.
            if (isUniqueViolation(err)) {
                await safeReply(interaction, {content: Strings.PROFILE_ALREADY_REGISTERED, ephemeral: true});
                return;
            }
            throw err;
        }
        if (interaction.guildId) await RoleUpdater.updateRegionRole(guildUser, interaction.guildId);
        await safeReply(interaction, Strings.REGISTRATION_SUCCESS);
    }
}
