import {APIEmbed, APIEmbedField, APIEmbedFooter, APIEmbedThumbnail, Role} from 'discord.js';
import type {PlayerListing} from 'scoresaber.js';
import countryFlag from './util/countryFlag';

export default class RankUpEmbed implements APIEmbed {
    title: string;
    url: string;
    description: string;
    color: number;
    thumbnail: APIEmbedThumbnail;
    fields: APIEmbedField[];
    footer: APIEmbedFooter;
    timestamp: string;

    constructor(player: PlayerListing, role: Role, regional: boolean, displayName: string) {
        const flag = countryFlag(player.country);
        const pp = `${Math.round(player.stats.totalPP).toLocaleString('en-US')}pp`;

        this.title = `🎉 ${displayName} ranked up!`;
        this.url = `https://scoresaber.com/u/${player.id}`;
        this.description = `Advanced to **${role.name}**`;
        // Tie the announcement to the rank role's colour; fall back to cyan if unset.
        this.color = role.color || 0x00ffff;
        this.thumbnail = {url: player.avatar};
        this.fields = [
            {name: 'Global Rank', value: `#${player.stats.rank.toLocaleString('en-US')}`, inline: true},
            {name: `${player.country} Rank`, value: `#${player.stats.countryRank.toLocaleString('en-US')}`, inline: true},
            {name: 'PP', value: pp, inline: true},
        ];
        this.footer = {text: `${flag} ${regional ? player.country : 'Global'} rank-up`.trim()};
        this.timestamp = new Date().toISOString();
    }
}
