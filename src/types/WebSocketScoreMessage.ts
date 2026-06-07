import {WebSocketMessage} from './WebSocketMessage';

/**
 * Score object as delivered by the live WebSocket feed (wss://scoresaber.com/ws).
 *
 * The feed still emits the legacy (v1) score/leaderboard shape, which the v2
 * REST client no longer models — so these are defined locally. Only the fields
 * the bot actually consumes are declared.
 */
export interface WebSocketScore {
    id: number;
    leaderboardPlayerInfo: {
        country: string;
    };
}

/** Leaderboard object as delivered by the live WebSocket feed (legacy/v1 shape). */
export interface WebSocketLeaderboard {
    id: number;
    songName: string;
    difficulty: {
        difficultyRaw: string;
    };
    ranked: boolean;
    maxScore: number;
    coverImage: string;
}

export interface WebSocketScoreMessage extends WebSocketMessage {
    commandName: 'score';
    commandData: {
        score: WebSocketScore;
        leaderboard: WebSocketLeaderboard;
    };
}

export function isScoreMessage(message: WebSocketMessage): message is WebSocketScoreMessage {
    return message.commandName === 'score';
}
