import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import ScoresaberAPI from '../api/scoresaber';
import extractScoreSaberID from '../util/extractScoreSaberID';
import {Player} from '../api/scoresaber/types/PlayerData';

export default class PPDiffCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('pp-diff')
        .setDescription('Returns the difference in PP between you and a given player.')
        .addSubcommand((subcommand) =>
            subcommand.setName('user')
                .setDescription('Get PP difference given a Discord User.')
                .addUserOption((option) =>
                    option.setName('player')
                        .setDescription('Discord User to compare PP with.')
                        .setRequired(true),
                ),
        ).addSubcommand((subcommand) =>
            subcommand.setName('scoresaber')
                .setDescription('Get PP difference given a Scoresaber ID.')
                .addStringOption((option) =>
                    option.setName('scoresaber')
                        .setDescription('Scoresaber Profile to compare PP with.')
                        .setRequired(true),
                ),
        );

    public async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}});
        if (!guildUser) {
            await interaction.reply(Strings.NO_USER);
            return;
        }

        // Get the user's Scoresaber
        const player = await ScoresaberAPI.getPlayerByID(guildUser.scoreSaberID);

        // Depending on sub command, Get target player's Scoresaber and Return difference
        if (interaction.options.getSubcommand() === 'scoresaber') {
            const scoresaber = interaction.options.getString('scoresaber')!;

            // Test if given an invalid ScoreSaber ID
            const scoresaberID = extractScoreSaberID(scoresaber);
            if (scoresaberID === null) {
                await interaction.reply(Strings.INVALID_PROFILE);
                return;
            }

            // Get target's Scoresaber and PP Difference
            const targetPlayer = await ScoresaberAPI.getPlayerByID(scoresaberID);
            const PPDiff = Math.abs(targetPlayer.pp - player.pp);

            await interaction.reply(this.diffString(PPDiff, player, targetPlayer));
        } else {
            const targetUser = await GuildUser.findOne({where: {discordID: interaction.options.getUser('player')?.id}});

            // Test if TargetUser is null
            if (!targetUser) {
                await interaction.reply(Strings.NO_USER);
                return;
            }

            // Get target's Scoresaber and PP Difference
            const targetPlayer = await ScoresaberAPI.getPlayerByID(targetUser.scoreSaberID);
            const PPDiff = Math.abs(targetPlayer.pp - player.pp);

            await interaction.reply(this.diffString(PPDiff, player, targetPlayer));
        }
    }

    public diffString(diff: number, user: Player, target: Player): string {
        if (target.pp > user.pp) {
            return `${target.name} has ${diff.toFixed(2)} more PP than you.`;
        } else if (user.pp > target.pp) {
            return `You have ${diff.toFixed(2)} more PP than ${target.name}.`;
        } else {
            return `You have the same PP as ${target.name}.`;
        }
    }
}
