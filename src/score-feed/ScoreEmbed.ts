import {APIEmbed, APIEmbedField, APIEmbedFooter, APIEmbedThumbnail} from 'discord.js';
import {LeaderboardInfo, Score} from 'scoresaber.js';

export default class ScoreEmbed implements APIEmbed {
    title: string;
    description: string;
    url: string;
    timestamp: string;
    color: number;
    footer: APIEmbedFooter;
    thumbnail: APIEmbedThumbnail;
    fields: APIEmbedField[];

    constructor(score: Score, leaderboard: LeaderboardInfo, regionalPosition: number, scoreSaberRegion: string) {
        this.title = `${score.leaderboardPlayerInfo!.name} set a #${regionalPosition} ${scoreSaberRegion.toUpperCase()} Score`;
        this.description = `Map - ${leaderboard.songName} (${leaderboard.difficulty.difficultyRaw.split('_')[1].replace('Plus', '+')}) [[Map Link]](https://scoresaber.com/leaderboard/${leaderboard.id})`;
        this.color = 0x00FFFF;
        this.fields = [
            {
                name: `Accuracy`,
                value: `${Math.round((score.baseScore / leaderboard.maxScore) * 10000) / 100}%`,
                inline: true,
            },
            {
                name: `Raw PP`,
                value: `${score.pp.toFixed(2)}`,
                inline: true,
            },
            {
                name: `Global Rank`,
                value: `${score.rank}`,
                inline: true,
            },
            {
                name: `Misses`,
                value: `${score.missedNotes}`,
                inline: true,
            },
            {
                name: `Bad Cuts`,
                value: `${score.badCuts}`,
                inline: true,
            },
            {
                name: `Max Combo`,
                value: `${score.maxCombo} ${(score.fullCombo ? '(FC)' : '')}`,
                inline: true,
            },
        ];
        this.timestamp = `${new Date().toISOString()}`;
        this.thumbnail = {
            'url': `${leaderboard.coverImage}`,
            'height': 256,
            'width': 256,
        };
        this.footer = {
            text: `Your Time Zone`,
        };
        this.url = `https://scoresaber.com/u/${score.leaderboardPlayerInfo!.id}`;
    }
}
