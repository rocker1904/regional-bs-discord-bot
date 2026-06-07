import {RawData, WebSocket} from 'ws';
import logger from '../util/logger';
import config from '../config.json';
import {SCORESABER_WS_URL, type LeaderboardScore} from 'scoresaber.js';
import scoreSaber from '../util/scoreSaber';
import Bot from '../Bot';
import ScoreEmbed from './ScoreEmbed';
import {WebSocketMessage} from '../types/WebSocketMessage';
import {WebSocketScoreMessage, isScoreMessage} from '../types/WebSocketScoreMessage';

export default class ScoreFeed {
    private ws?: WebSocket;
    private isReconnectEnabled = true;
    private initialReconnectDelay = 15 * 1000;
    private currentReconnectDelay = this.initialReconnectDelay;
    private maxReconnectDelay = 16 * 1000 * 60;

    constructor() {
        this.start();
    }

    public start() {
        this.isReconnectEnabled = true;
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.connect();
            logger.info('Score feed started!');
        } else {
            logger.info('Score feed already running');
        }
    }

    public stop() {
        this.isReconnectEnabled = false;
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            this.ws.close();
            logger.info('Score feed stopped!');
        } else {
            logger.info('Score feed already stopping/stopped');
        }
    }

    private connect() {
        this.ws = new WebSocket(SCORESABER_WS_URL, {
            headers: {'User-Agent': 'Regional BS Discord Bot'},
        });
        this.ws.on('open', () => (this.currentReconnectDelay = this.initialReconnectDelay));
        this.ws.on('message', (message) => void this.onMessage(message));
        this.ws.on('error', (err) => logger.error('Score feed WS error: ', err));
        this.ws.on('close', () => {
            if (this.isReconnectEnabled) {
                setTimeout(() => this.connect(), this.currentReconnectDelay);
                this.currentReconnectDelay = Math.min(this.currentReconnectDelay * 2, this.maxReconnectDelay);
            }
        });
    }

    private async onMessage(data: RawData) {
        // RawData is Buffer | ArrayBuffer | Buffer[]; normalise to text explicitly.
        const messageString = Buffer.isBuffer(data)
            ? data.toString()
            : Array.isArray(data)
              ? Buffer.concat(data).toString()
              : Buffer.from(data).toString();
        if (messageString === 'Connected to the ScoreSaber WSS') {
            logger.info(messageString);
            return;
        }

        let message: WebSocketMessage;
        try {
            message = JSON.parse(messageString) as WebSocketMessage;
        } catch (err) {
            logger.warning('Error parsing ScoreSaber web socket message: ', err);
            return;
        }

        if (isScoreMessage(message)) {
            await this.handleScoreMessage(message);
            return;
        }
    }

    private async handleScoreMessage(scoreMessage: WebSocketScoreMessage) {
        const score = scoreMessage.commandData.score;
        const region = score.leaderboardPlayerInfo.country;
        const leaderboard = scoreMessage.commandData.leaderboard;
        const guildConfigs = config.guildConfigs.filter(
            ({scoreFeedConfig, scoreSaberRegions}) =>
                scoreFeedConfig !== undefined &&
                (leaderboard.ranked || scoreFeedConfig.allowUnrankedScores) &&
                scoreSaberRegions.some((configRegion) => configRegion.toLowerCase() === region.toLowerCase()),
        );

        // Guilds that share a region scope need identical leaderboard data for this
        // score, so fetch each scope at most once per event (no cross-event cache —
        // a stale list wouldn't contain this just-set score).
        const scoresByScope = new Map<string, LeaderboardScore[]>();
        for (const {guildID, scoreFeedConfig, scoreSaberRegions} of guildConfigs) {
            if (!scoreFeedConfig) continue;
            const combinedRegions = scoreSaberRegions.join(',');
            let regionalScores = scoresByScope.get(combinedRegions);
            if (!regionalScores) {
                const collection = await scoreSaber.leaderboards.scoresPage(leaderboard.id, {
                    page: 1,
                    scope: combinedRegions,
                    limit: 100,
                });
                regionalScores = collection.data;
                scoresByScope.set(combinedRegions, regionalScores);
            }

            // Setting the first scores on a map shouldn't count
            // if (scoreFeedConfig.positionRequirement >= regionalScores.length) return;

            const regionalPosition = regionalScores.findIndex((regionalScore) => regionalScore.id === score.id) + 1;
            if (regionalPosition === 0 || regionalPosition > scoreFeedConfig.positionRequirement) continue;

            // Build the embed from the canonical leaderboard score (richer + already
            // has accuracy/pp), keeping the map metadata from the WS payload.
            const matchedScore = regionalScores[regionalPosition - 1];
            const scoreFeedChannel = Bot.scoreFeedChannels[guildID];
            const embed = new ScoreEmbed(matchedScore, leaderboard, regionalPosition, combinedRegions);
            await scoreFeedChannel.send({embeds: [embed]});
        }
    }
}
