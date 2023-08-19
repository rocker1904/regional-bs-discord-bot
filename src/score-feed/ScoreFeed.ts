import {RawData, WebSocket} from 'ws';
import logger from '../util/logger';
import config from '../config.json';
import ScoreSaberAPI from 'scoresaber.js';
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
        this.ws = new WebSocket('wss://scoresaber.com/ws', {
            headers: {'User-Agent': 'Regional BS Discord Bot'},
        });
        this.ws.on('open', () => this.currentReconnectDelay = this.initialReconnectDelay);
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
        const messageString = data.toString();
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
        const guildConfigs = config.guildConfigs.filter(({scoreFeedConfig, scoreSaberRegions}) =>
            scoreFeedConfig !== undefined &&
            (leaderboard.ranked || scoreFeedConfig.allowUnrankedScores) &&
            scoreSaberRegions.some((configRegion) => configRegion.toLowerCase() === region.toLowerCase()),
        );

        for (const {guildID, scoreFeedConfig, scoreSaberRegions} of guildConfigs) {
            if (!scoreFeedConfig) continue;
            const combinedRegions = scoreSaberRegions.join(',');
            const regionalScoreCollection = await ScoreSaberAPI.fetchLeaderboardScores(leaderboard.id, 1, combinedRegions);
            const regionalScores = regionalScoreCollection.scores;

            // Setting the first scores on a map shouldn't count
            if (scoreFeedConfig.positionRequirement >= regionalScores.length) return;

            const regionalPosition = regionalScores.findIndex((regionalScore) => regionalScore.id === score.id) + 1;
            if (regionalPosition === 0 || regionalPosition > scoreFeedConfig.positionRequirement) return;

            const scoreFeedChannel = Bot.scoreFeedChannels[guildID];
            const embed = new ScoreEmbed(score, leaderboard, regionalPosition, combinedRegions);
            await scoreFeedChannel.send({embeds: [embed]});
        }
    }
}
