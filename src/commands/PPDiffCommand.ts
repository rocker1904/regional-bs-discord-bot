import {CommandInteraction, EmbedBuilder, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import scoreSaber from '../util/scoreSaber';
import safeReply from '../util/safeReply';
import extractScoreSaberID from '../util/extractScoreSaberID';
import {type BasicPlayer} from 'scoresaber.js';
import logger from '../util/logger';

export default class PPDiffCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('pp-diff')
        .setDescription('Returns the difference in PP between you and a given player.')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('user')
                .setDescription('Get PP difference given a Discord User.')
                .addUserOption((option) => option.setName('player').setDescription('Discord User to compare PP with.').setRequired(true)),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('scoresaber')
                .setDescription('Get PP difference given a ScoreSaber ID.')
                .addStringOption((option) =>
                    option.setName('scoresaber').setDescription('ScoreSaber Profile to compare PP with.').setRequired(true),
                ),
        );

    public async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}});
        if (!guildUser) {
            await safeReply(interaction, {content: Strings.NO_USER, ephemeral: true});
            return;
        }

        // Get the user's ScoreSaber
        const player = await scoreSaber.players.getBasic(guildUser.scoreSaberID).catch((err) => {
            logger.error('PP diff command failed. Error fetching player.');
            logger.error(err);
            void safeReply(interaction, {content: 'Command failed. Error fetching data from ScoreSaber', ephemeral: true});
        });
        if (!player) return;

        // Depending on sub command, Get target player's ScoreSaber and Return difference
        if (interaction.options.getSubcommand() === 'scoresaber') {
            const scoresaber = interaction.options.getString('scoresaber')!;

            // Test if given an invalid ScoreSaber ID
            const scoresaberID = extractScoreSaberID(scoresaber);
            if (scoresaberID === null) {
                await safeReply(interaction, {content: Strings.INVALID_PROFILE, ephemeral: true});
                return;
            }

            // Get target's ScoreSaber and PP Difference
            const targetPlayer = await scoreSaber.players.getBasic(scoresaberID).catch((err) => {
                logger.error('Gains command failed. Error fetching target player.');
                logger.error(err);
                void safeReply(interaction, {content: 'Command failed. Error fetching data from ScoreSaber', ephemeral: true});
            });
            if (!targetPlayer) return;
            await safeReply(interaction, {embeds: [this.diffEmbed(player, targetPlayer)]});
        } else {
            const targetUser = await GuildUser.findOne({where: {discordID: interaction.options.getUser('player')?.id}});

            // Test if TargetUser is null
            if (!targetUser) {
                await safeReply(interaction, {content: Strings.NO_USER, ephemeral: true});
                return;
            }

            // Get target's ScoreSaber and PP Difference
            const targetPlayer = await scoreSaber.players.getBasic(targetUser.scoreSaberID).catch((err) => {
                logger.error('Gains command failed. Error fetching target player.');
                logger.error(err);
                void safeReply(interaction, {content: 'Command failed. Error fetching data from ScoreSaber', ephemeral: true});
            });
            if (!targetPlayer) return;
            await safeReply(interaction, {embeds: [this.diffEmbed(player, targetPlayer)]});
        }
    }

    public diffEmbed(user: BasicPlayer, target: BasicPlayer): EmbedBuilder {
        const diff = Math.abs(target.stats.totalPP - user.stats.totalPP);
        return new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle('PP Difference')
            .setThumbnail(target.avatar)
            .setDescription(this.diffString(diff, user, target))
            .addFields(
                {name: user.name, value: `${user.stats.totalPP.toFixed(2)}pp`, inline: true},
                {name: target.name, value: `${target.stats.totalPP.toFixed(2)}pp`, inline: true},
            );
    }

    public diffString(diff: number, user: BasicPlayer, target: BasicPlayer): string {
        if (target.stats.totalPP > user.stats.totalPP) {
            return `${target.name} has ${diff.toFixed(2)} more PP than you.`;
        } else if (user.stats.totalPP > target.stats.totalPP) {
            return `You have ${diff.toFixed(2)} more PP than ${target.name}.`;
        } else {
            return `You have the same PP as ${target.name}.`;
        }
    }
}
