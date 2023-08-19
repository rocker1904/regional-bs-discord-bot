import {LeaderboardInfo, Score} from 'scoresaber.js';
import {WebSocketMessage} from './WebSocketMessage';

export interface WebSocketScoreMessage extends WebSocketMessage {
    commandName: 'score';
    commandData: {
        score: Required<Score>;
        leaderboard: LeaderboardInfo;
    };
}

export function isScoreMessage(message: WebSocketMessage): message is WebSocketScoreMessage {
    return message.commandName === 'score';
}
