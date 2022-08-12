import Axios, {AxiosError} from 'axios';
import {LeaderboardInfo, ScoreCollection} from './types/LeaderboardData';
import {BasicPlayer, FullPlayer, Player, PlayerCollection, PlayerScore, PlayerScoreCollection} from './types/PlayerData';
import axiosRetry from 'axios-retry';
import logger from '../../util/logger';

axiosRetry(Axios, {
    retries: 3,
});

export default class ScoreSaberAPI {
    private static SS_BASE_URL = 'https://scoresaber.com/api/';
    private static rateLimitRemaining = 400;
    private static rateLimitReset = -1; // Unix timestamp, initialised by the first request

    private static async fetchPage(relativePath: string): Promise<unknown> {
        // Initialise rate limit reset time if uninitialised
        if (this.rateLimitReset === -1) {
            this.rateLimitReset = Math.floor(Date.now() / 1000) + 61; // 61 not 60 just to be safe
            setTimeout(() => this.rateLimitRemaining = 400, this.rateLimitReset * 1000 - Date.now());
        }

        // When we run out of requests, wait until the limit resets
        while (this.rateLimitRemaining <= 10) {
            const expiresInMillis = this.rateLimitReset * 1000 - Date.now() + 1000;
            await new Promise((resolve) => setTimeout(resolve, expiresInMillis));
        }

        // Make the request
        const response = await Axios.get(this.SS_BASE_URL + relativePath).catch((error: Error | AxiosError) => {
            if (Axios.isAxiosError(error)) {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    logger.error(error.response.data);
                    logger.error(error.response.status);
                    logger.error(error.response.headers);
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    logger.error(error.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    logger.error(`Error ${error.message}`);
                }
            } else {
                // Just a stock error
                logger.error(`Error ${error.message}`);
            }
        });
        this.rateLimitRemaining--;
        if (!response) throw new Error('Page request failed.');

        // Update the reset time if it changed
        const ratelimitReset = parseInt(response.headers['x-ratelimit-reset']);
        if (this.rateLimitReset < ratelimitReset) {
            this.rateLimitReset = ratelimitReset;
            setTimeout(() => this.rateLimitRemaining = 400, this.rateLimitReset * 1000 - Date.now() + 500);
        }
        return response.data as unknown;
    }

    public static async fetchPlayerByRank(rank: number, region?: string): Promise<Player> {
        const pageNum = Math.ceil(rank / 50);
        let request = `players?page=${pageNum}`;
        if (region) request += `&countries=${region}`;
        const playerCollection = await this.fetchPage(request) as PlayerCollection;
        return playerCollection.players[rank % 50 - 1];
    }

    public static async fetchPlayersUnderRank(rank: number, region?: string): Promise<Player[]> {
        let players: Player[] = [];
        const totalPages = Math.ceil(rank / 50);
        const promises = [];
        for (let i = 0; i < totalPages; i++) {
            let request = `players?page=${i + 1}`;
            if (region) request += `&countries=${region}`;
            const promise = this.fetchPage(request).then((playerCollection) => {
                players = players.concat((playerCollection as PlayerCollection).players);
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        players.sort((a, b) => b.pp - a.pp); // Ensure players are in ascending order
        return players;
    }

    public static async fetchBasicPlayer(playerId: string): Promise<BasicPlayer> {
        const basicPlayer = await this.fetchPage(`player/${playerId}/basic`) as BasicPlayer;
        return basicPlayer;
    }

    public static async fetchFullPlayer(playerId: string): Promise<FullPlayer> {
        const fullPlayer = await this.fetchPage(`player/${playerId}/full`) as FullPlayer;
        return fullPlayer;
    }

    public static async fetchScoresPage(playerId: string, pageNum: number): Promise<PlayerScoreCollection> {
        const scoresPage = await this.fetchPage(`player/${playerId}/scores?limit=100&sort=recent&page=${pageNum}`) as PlayerScoreCollection;
        return scoresPage;
    }

    public static async fetchLeaderboardScores(leaderboardId: number, page = 1): Promise<ScoreCollection> {
        const scoreCollection = await this.fetchPage(`leaderboard/by-id/${leaderboardId}/scores?page=${page}`) as ScoreCollection;
        return scoreCollection;
    }

    public static async fetchLeaderboardInfo(leaderboardId: number): Promise<LeaderboardInfo> {
        const scoreCollection = await this.fetchPage(`leaderboard/by-id/${leaderboardId}/info`) as LeaderboardInfo;
        return scoreCollection;
    }

    // Fetches all of a players scores by simultaneous requests of all score pages
    public static async fetchAllScores(playerId: string): Promise<PlayerScore[]> {
        const fullPlayer = await ScoreSaberAPI.fetchFullPlayer(playerId);
        const totalPages = Math.ceil(fullPlayer.scoreStats.totalPlayCount / 100);
        let playerScores = [] as PlayerScore[];
        const promises = [];
        for (let i = 1; i <= totalPages; i++) {
            const promise = ScoreSaberAPI.fetchScoresPage(playerId, i).then((scoresPage) => {
                playerScores = playerScores.concat(scoresPage.playerScores);
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        return playerScores;
    }
}
