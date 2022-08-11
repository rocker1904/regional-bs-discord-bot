import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import extractScoreSaberID from '../util/extractScoreSaberID';
import Strings from '../util/Strings';
import Command from './Command';

export default class RegisterCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register with the bot')
        .addStringOption((option) =>
            option.setName('scoresaber')
                .setDescription('ScoreSaber Link or ID')
                .setRequired(true),
        );

    public async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        const user = interaction.user;
        const scoreSaber = interaction.options.getString('scoresaber')!; // Required option so should be safe to assert not null

        // Test if given an invalid ScoreSaber ID
        const scoreSaberID = extractScoreSaberID(scoreSaber);
        if (scoreSaberID === null) {
            await interaction.reply(Strings.INVALID_PROFILE);
            return;
        }

        // Test if the ScoreSaber profile is already in the database
        if (await GuildUser.findOne({where: {scoreSaberID: scoreSaberID}})) {
            await interaction.reply(Strings.PROFILE_ALREADY_REGISTERED);
            return;
        }

        // Test if the user is already in the database
        if (await GuildUser.findOne({where: {discordID: user.id}})) {
            await interaction.reply(Strings.USER_ALREADY_REGISTERED);
            return;
        }

        const guildUser = new GuildUser();
        guildUser.discordID = user.id;
        guildUser.scoreSaberID = scoreSaberID;
        await guildUser.save();
        await interaction.reply(Strings.REGISTRATION_SUCCESS);
    }
}
