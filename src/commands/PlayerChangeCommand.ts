import {SlashCommandBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import ScoresaberAPI from '../api/scoresaber';
import { GainsCommandData } from '../entity/GainsCommandData';

export default class PlayerChangeCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('gains')
        .setDescription('Returns the PP and Rank change since last using the command.')

    public async execute(interaction: CommandInteraction) {

        // Fetch user from db
        const guildUser = await GuildUser.findOne(interaction.user.id);
        if (!guildUser) {
            await interaction.reply(Strings.NO_USER);
            return;
        }

        // Get the user's Scoresaber
        const player = await ScoresaberAPI.getPlayerByID(guildUser.scoreSaberID);
        const gainsData = await GainsCommandData.findOne(guildUser.gainsData);

        if(!gainsData) {
            const newGainsData = new GainsCommandData();
            newGainsData.globalRank = player.rank;
            newGainsData.time = new Date();
            newGainsData.pp = player.pp;
            await newGainsData.save();
            guildUser.gainsData = newGainsData;
            await guildUser.save();
            return;
        } else {
        
            // Get the change
            const globalRankChange = Math.abs(player.rank - gainsData.globalRank);
            const ppChange = Math.abs(player.pp - gainsData.pp);

            var reply = "";
            if(player.pp > gainsData.pp) {
                reply += `You **gained ${ppChange.toFixed(2)}PP** in the last ${await this.DiffDate(gainsData.time)}`;
            } else if(gainsData.pp > player.pp) {
                reply += `You **lost ${ppChange.toFixed(2)}PP** in the last ${await this.DiffDate(gainsData.time)}`;
            } else {
                reply += `Your PP has **stayed the same** in the last ${await this.DiffDate(gainsData.time)}`;
            }

            if(player.rank > gainsData.globalRank){
                reply += ` (and **lost ${globalRankChange}** ranks)`;
            } else if(player.rank < gainsData.globalRank) {
                reply += ` (and **gained ${globalRankChange}** ranks)`;
            } else {
                reply += ` (and **stayed the same** rank)`;
            }

            await interaction.reply(reply);

            // Update Gains Data
            gainsData.globalRank = player.rank;
            gainsData.time = new Date();
            gainsData.pp = player.pp;
            await gainsData.save();
        }
    }

    // Helper function for calculating date difference
    public async DiffDate(date: Date): Promise<string> {
        var diff = Math.abs(new Date().getTime() - date.getTime());
        var days = Math.ceil(diff / (1000 * 3600 * 24));
        if(days > 1) { return days + " days"; } else { return "day"; }
    }
}