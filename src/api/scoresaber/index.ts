import Axios from 'axios';
import {Player} from './types/PlayerData';

export default class ScoresaberAPI {
    public static async getPlayerByRank(rank: number, region?: string): Promise<Player> {
        const page = Math.ceil(rank / 50);
        let request = `https://scoresaber.com/api/players?page=${page}`;
        if (region) request += `&countries=${region}`;

        const response = await Axios.get(request); // TODO: Handle request fail
        const players = response.data as Player[];
        return players[rank % 50 - 1];
    }

    public static async getPlayerByID(id: string): Promise<Player> {
        const response = await Axios.get(`https://scoresaber.com/api/player/${id}`); // TODO: Handle request fail
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
            players = players.concat(response.data as Player[]);
        }
        return players;
    }
}
