import Axios, {AxiosResponse} from 'axios';
import {Player, PlayerCollection} from './types/PlayerData';

export default class ScoresaberAPI {
    private static async waitForRateLimit(resp: AxiosResponse<any, any>) {
        if (resp.headers['x-ratelimit-remaining'] === '1') {
            const expiresInMillis = parseInt(resp.headers['x-ratelimit-reset']) * 1000 - new Date().getTime() + 1000;
            await new Promise((resolve) => setTimeout(resolve, expiresInMillis));
        }
    }

    public static async getPlayerByRank(rank: number, region?: string): Promise<Player> {
        const page = Math.ceil(rank / 50);
        let request = `https://scoresaber.com/api/players?page=${page}`;
        if (region) request += `&countries=${region}`;

        const response = await Axios.get(request); // TODO: Handle request fail
        const playerCollection = response.data as PlayerCollection;
        return playerCollection.players[rank % 50 - 1];
    }

    public static async getPlayerByID(id: string): Promise<Player> {
        const response = await Axios.get(`https://scoresaber.com/api/player/${id}/basic`); // TODO: Handle request fail
        const player = response.data as Player;
        return player;
    }

    public static async getPlayersUnderRank(rank: number, region?: string): Promise<Player[]> {
        let players: Player[] = [];
        const totalPages = Math.ceil(rank / 50);
        for (let i = 0; i < totalPages; i++) {
            let request = `https://scoresaber.com/api/players?page=${i + 1}`;
            if (region) request += `&countries=${region}`;
            const response = await Axios.get(request); // TODO: Handle request fail
            const playerCollection = response.data as PlayerCollection;
            players = players.concat(playerCollection.players);
            await this.waitForRateLimit(response);
        }
        return players;
    }
}
