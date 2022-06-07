import {SlashCommandBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import ScoresaberAPI from '../api/scoresaber';
import extractScoreSaberID from '../util/extractScoreSaberID';
import { Player } from '../api/scoresaber/types/PlayerData';
import { GainsCommandData } from '../entity/GainsCommandData';
import { IsNull } from 'typeorm';

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
            await interaction.reply("No Prior Gains Data found.");
        } else {
        
            // Get the change
            const globalRankChange = Math.abs(player.rank - gainsData.globalRank);
            const ppChange = Math.abs(player.pp - gainsData.pp);

            var reply = "You ";
            if(player.pp > gainsData.pp) {
                reply += `**gained ${ppChange.toFixed(2)}** in the last ${await this.DiffDate(gainsData.time)} days `;
            } else {
                reply += `**lost ${ppChange.toFixed(2)}** in the last ${await this.DiffDate(gainsData.time)} days `;
            }

            if(player.rank > gainsData.globalRank){
                reply += `(and **lost ${globalRankChange}** ranks)`;
            } else {
                reply += `(and **gained ${globalRankChange}** ranks)`;
            }

            await interaction.reply(reply);

            // Update Gains Data
            gainsData.globalRank = player.rank;
            gainsData.time = new Date();
            gainsData.pp = player.pp;
            await gainsData.save();
        }
    }

    public async DiffDate(date: Date): Promise<Number> {
        var diff = Math.abs(new Date().getTime() - date.getTime());
        var days = Math.ceil(diff / (1000 * 3600 * 24));
        return days;
    }
}