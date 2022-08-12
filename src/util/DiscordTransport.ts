import Bot from '../Bot';
import Transport from 'winston-transport';

// Winston transport to enable logging to a Discord channel.
export default class DiscordTransport extends Transport {
    constructor(opts: Transport.TransportStreamOptions) {
        super(opts);
    }

    async log(info: {level: string, message: string, guildID?: string}, callback: () => void): Promise<void> {
        setImmediate(() => {
            this.emit('logged', info);
        });

        try {
            if (info && info.message.length && info.guildID) {
                if (info.message === 'undefined') {
                    await Bot.logChannels[info.guildID].send(`No error message, printing info object:\n${JSON.stringify(info)}`);
                } else {
                    await Bot.logChannels[info.guildID].send(`${info.level.charAt(0).toUpperCase() + info.level.slice(1)}: ${info.message}`);
                }
            }
        } catch (e) {
            if (typeof e === 'string') {
                console.error(`Logger error: ${e}`);
            } else if (e instanceof Error) {
                console.error(`Logger error: ${e.message}`);
            } else {
                console.error('Logger error of unexpected type');
                console.error(e);
            }
        }

        callback();
    }
}
