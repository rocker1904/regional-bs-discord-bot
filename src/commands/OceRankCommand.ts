import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Command from './Command';
import Strings from '../util/Strings';
import scoreSaber from '../util/scoreSaber';
import safeReply from '../util/safeReply';
import logger from '../util/logger';

// Shape returned by the OCE leaderboard API (leaderboard-api.ocebs.com), which
// is independent of ScoreSaber. Only the fields the bot reads are declared.
interface OcePlayer {
    data: {
        id: string;
        name: string;
        pp: number;
    };
}

const OCE_LEADERBOARD_URL = 'https://leaderboard-api.ocebs.com/rest/v1/player';

// The OCE leaderboard API can be flaky, so retry a few times. Deliberately not
// cached: competitive players set a score and immediately check their new rank.
async function fetchOcePlayers(retries = 3): Promise<OcePlayer[]> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(OCE_LEADERBOARD_URL);
            if (!response.ok) throw new Error(`OCE leaderboard API responded ${response.status}`);
            return (await response.json()) as OcePlayer[];
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

export default class OceRankCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('oce-rank')
        .setDescription('Returns the pp diff between you and the people around you on the oce leaderboard.');

    public async execute(interaction: CommandInteraction) {
        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}});

        if (!guildUser) {
            await safeReply(interaction, {content: Strings.NO_USER, ephemeral: true});
            return;
        }

        // Get region of this player
        const player = await scoreSaber.players.getBasic(guildUser.scoreSaberID).catch((err) => {
            logger.error('OCE rank command failed. Error fetching player.');
            logger.error(err);
            void safeReply(interaction, {content: 'Command failed. Error fetching data from ScoreSaber', ephemeral: true});
        });
        if (!player) return;
        if (player.country !== 'AU' && player.country !== 'NZ') {
            await safeReply(interaction, {content: "You're not from OCE.", ephemeral: true});
            return;
        }

        const ocePlayers = await fetchOcePlayers().catch((err) => {
            logger.error('OCE rank command failed. Error fetching OCE leaderboard.');
            logger.error(err);
        });
        if (!ocePlayers) {
            await safeReply(interaction, {content: 'Command failed. Could not reach the OCE leaderboard.', ephemeral: true});
            return;
        }
        ocePlayers.sort((a, b) => b.data.pp - a.data.pp);
        const idx = ocePlayers.findIndex((ocePlayer) => ocePlayer.data.id === player.id);

        if (idx === -1) {
            await safeReply(interaction, {
                content: "Sorry, you're not high enough rank for this command to work, please complain to Byhemechi :)",
                ephemeral: true,
            });
            return;
        }

        if (idx === 0) {
            const playerBelow = ocePlayers[1].data;
            await safeReply(interaction, `You are ${(ocePlayers[idx].data.pp - playerBelow.pp).toFixed(2)}PP above ${playerBelow.name}`);
            return;
        }

        const playerAbove = ocePlayers[idx - 1].data;
        let reply = `__**OCE ranks around you:**__
#${idx} **${playerAbove.name}** has ${(playerAbove.pp - ocePlayers[idx].data.pp).toFixed(2)} more PP than you.
#${idx + 1} **You (${player.name})** have ${ocePlayers[idx].data.pp}PP.`;

        if (idx !== ocePlayers.length - 1) {
            const playerBelow = ocePlayers[idx + 1].data;
            reply += `\n#${idx + 2} **${playerBelow.name}** has ${(ocePlayers[idx].data.pp - playerBelow.pp).toFixed(2)} less PP than you.`;
        }

        await safeReply(interaction, reply);
    }
}
