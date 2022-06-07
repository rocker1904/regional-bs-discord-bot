import {SlashCommandBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';
import Bot from '../Bot';
import {GuildUser} from '../entity/GuildUser';
import extractScoreSaberID from '../util/extractScoreSaberID';
import Strings from '../util/Strings';
import Command from './Command';

export default class GetCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('get')
        .setDescription('Get a user or profile')
        .setDefaultPermission(false)
        .addSubcommand((subcommand) =>
            subcommand.setName('user')
                .setDescription('Get the user associated with a given profile')
                .addStringOption((option) =>
                    option.setName('scoresaber')
                        .setDescription('ScoreSaber Link or ID')
                        .setRequired(true),
                ),
        ).addSubcommand((subcommand) =>
            subcommand.setName('profile')
                .setDescription('Get the profile associated with a given user')
                .addUserOption((option) =>
                    option.setName('user')
                        .setDescription('User to get the profile of')
                        .setRequired(true),
                ),
        );

    public async execute(interaction: CommandInteraction) {
        if (interaction.options.getSubcommand() === 'user') {
            const scoreSaber = interaction.options.getString('scoresaber')!; // Required options so should be safe to assert not null

            // Test if given an invalid ScoreSaber ID
            const scoreSaberID = extractScoreSaberID(scoreSaber);
            if (scoreSaberID === null) {
                await interaction.reply(Strings.INVALID_PROFILE);
                return;
            }

            // Find user
            const guildUser = await GuildUser.findOne({scoreSaberID});
            if (guildUser) {
                const user = await Bot.client.users.fetch(guildUser.discordID);
                if (!user) {
                    await interaction.reply(`Discord ID: ${guildUser.discordID}, user information could not be found.`);
                } else {
                    await interaction.reply(`User: ${user.tag}\nID: ${guildUser.discordID}`);
                }
                return;
            } else {
                await interaction.reply(Strings.NO_USER);
                return;
            }
        } else {
            const user = interaction.options.getUser('user')!;

            // Find user
            const guildUser = await GuildUser.findOne(user.id);
            if (guildUser) {
                await interaction.reply(`https://scoresaber.com/u/${guildUser.scoreSaberID}`);
                return;
            } else {
                await interaction.reply(Strings.NO_PROFILE);
                return;
            }
        }
    }
}
