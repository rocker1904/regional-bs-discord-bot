import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {CounterData} from '../entity/CounterData';
import TimeStuff from '../util/TimeStuff';
import Command from './Command';

export default class GetCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('counter')
        .setDescription('Reset counter')
        .setDefaultMemberPermissions(0);

    public async execute(interaction: CommandInteraction) {
        // Get previous time from database
        const counterData = await CounterData.findOne({where: {counterName: 'The Counter'}});
        if (!counterData) {
            // If counter doesn't exist, initialise
            const newCounterData = new CounterData();
            newCounterData.counterName = 'The Counter';
            newCounterData.time = new Date();
            await newCounterData.save();
            await interaction.reply('Started counter!');
            return;
        }

        // Reply with time difference since then
        const timeDiffString = TimeStuff.calculateTime(Date.now() - counterData.time.getTime());
        await interaction.reply(`It has been ${timeDiffString} since the last mention.`);

        // Write current time to database
        counterData.time = new Date();
        await counterData.save();
    }
}
