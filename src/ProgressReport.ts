import { TextChannel } from 'discord.js';
import ScoresaberAPI from './api/scoresaber';
import {Player} from './api/scoresaber/types/PlayerData';
import Bot from './Bot';
import {guildConfigs} from './config.json';
import logger from './util/logger';
import Canvas from '@napi-rs/canvas';

type PlayerPageEntry = {player: Player, colour: string};

export default class ProgressReport {
    
    constructor() {
        // Fire the progress report at 12pm on the 1st of every month.
        const cron = require('node-cron');
        cron.schedule('0 12 1 * *', function() {
            logger.info('Running progress report');
            void Bot.progressReport.main();
        });
    }

    public start() {

    }

    public stop() {

    }

    public async main() {
        for (const guildConfig of guildConfigs) {
            const {guildID, progressReportChannelID, progressReportMaxRegionRank, regionRankGroups, scoresaberRegion} = guildConfig;

            logger.info(guildID+", "+progressReportChannelID+", "+progressReportMaxRegionRank+", "+scoresaberRegion);

            const channel = Bot.progressReportChannels[guildID];
            if (!channel) return;

            let topCountryRankPlayers = await ScoresaberAPI.fetchPlayersUnderRank(progressReportMaxRegionRank, scoresaberRegion).catch((err) => {
                logger.error('Progress report failed. Error fetching players.');
                logger.error(err);
            });

            if (!topCountryRankPlayers) return;

            let roles = [];
            for (const regionRankGroup of regionRankGroups) {
                let role = await Bot.guilds[guildID].roles.fetch(regionRankGroup.roleID);
                if (!role) return;
                roles.push({role: role, config: regionRankGroup});
            }

            const minPlayersPerPage = 10;
            const maxPlayersPerPage = 25;
            let playerPages = [];
            let currentPage = [];
            let currentRoleIndex = 0;
            let pageReady = false;
            
            for (const player of topCountryRankPlayers) {
                currentPage.push({player: player, colour: roles[currentRoleIndex].role.hexColor});
                if (player.countryRank >= roles[currentRoleIndex].config.rank) {
                    ++currentRoleIndex;
                    if (currentPage.length >= minPlayersPerPage) {
                        pageReady = true;
                    }
                }
                else if (currentPage.length == maxPlayersPerPage) {
                    pageReady = true;
                }

                if (pageReady) {
                    playerPages.push(currentPage);
                    currentPage = [];
                    pageReady = false;
                }
            }
            
            for (const playerPage of playerPages) {
                await this.drawAndSubmitPlayerProgressPage(channel, playerPage);
            }
        }
    }

    private getPlayerProgressString(player: Player): string {
        const countryRankSpace = 6;
        const globalRankSpace = 7;

        let returnString = "";
        returnString += this.padText("| #"+player.countryRank, countryRankSpace);
        returnString += this.padText("("+player.rank+")", globalRankSpace);
        returnString += player.pp.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + "pp";
        returnString += "  "+player.name;

        logger.info(returnString);

        return '`' + returnString + '`';
    }

    private padText(str: string, maxLength: number): string {
        if (str.length == maxLength) return str;
        if (str.length > maxLength) return str.substring(0, maxLength-3) + "...";
        return str + ' '.repeat(maxLength-str.length);
    }

    private async drawAndSubmitPlayerProgressPage(channel: TextChannel, players: PlayerPageEntry[]) {
        const imgSize = 700;
        const padding = 10;
        const rowHeight = (imgSize - (padding*2)) / players.length;
        const fontSize = Math.max(28, rowHeight/2);

        const canvas = Canvas.createCanvas(700, 700);
        const context = canvas.getContext('2d');

        let index = 0;
        for (const player of players) {
            await this.drawPlayerProgress(channel, context, player, padding, padding + rowHeight*(index++), rowHeight, fontSize);
        }

        const img = await canvas.encode('png');
        channel.send({files: [img]});
    }

    private async drawPlayerProgress(channel: TextChannel, context: Canvas.SKRSContext2D, player: PlayerPageEntry, x: number, y: number, height: number, fontSize: number) {
        const padding = 10;
        const textY = y + (height/2);

        context.font = 'bold '+fontSize+'px Calibri';
        context.textBaseline = 'middle';
        context.textAlign = 'right';
        const countryRankStrMetrics = context.measureText('999');

        // Alternating shading on background rows for readability
        if (player.player.countryRank % 2 == 0) {
            context.fillStyle = "#00000011";
            context.fillRect(x,y,context.canvas.width-(padding*2),height);            
        }

        // Country rank
        context.fillStyle = 'white';
        const countryRankStr = player.player.countryRank.toLocaleString("en-US", {minimumIntegerDigits:2});
        const countryRankStrX = x + countryRankStrMetrics.width;
        context.fillText(countryRankStr, countryRankStrX, textY);

        // Prepare circular clipping for profile picture
        const avatarX = countryRankStrX + padding*2;
        context.save();
        context.beginPath();
        context.arc(avatarX + (height/2), y + (height/2), height/2, 0, Math.PI*2, true);
        context.closePath();
        context.clip();

        // Profile picture
        const avatar = await Canvas.loadImage(player.player.profilePicture);
        context.drawImage(avatar, avatarX, y, height, height);
        context.restore();

        // Username
        context.textAlign = 'start';
        context.fillStyle = player.colour;
        context.strokeStyle = 'black';
        const playerNameStr = player.player.name;
        const playerNameStrX = avatarX + height + padding*2;
        const ppStr = player.player.pp.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})+"pp";
        context.fillText(playerNameStr, playerNameStrX, textY);
        context.strokeText(playerNameStr, playerNameStrX, textY);

        // PP
        context.textAlign = 'right';
        context.fillText(ppStr, context.canvas.width-10, textY);
        context.strokeText(ppStr, context.canvas.width-10, textY);
    }
}