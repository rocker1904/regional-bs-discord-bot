import winston from 'winston';
import DiscordTransport from './DiscordTransport';

/* syslog levels
{
  emerg: 0,
  alert: 1,
  crit: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7
}
*/

const logger = winston.createLogger({
    level: 'debug',
    levels: winston.config.syslog.levels,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf((info) => `${info.timestamp as string} ${info.level}: ${info.message}`),
    ),
    transports: [
        // Send all messages to console, write errors to error.log, write info and below to combined.log
        new winston.transports.File({filename: 'error.log', level: 'error', format: winston.format.uncolorize()}),
        new winston.transports.File({filename: 'combined.log', format: winston.format.uncolorize()}),
        new winston.transports.Console({level: 'debug'}),
    ],
});

// If in production, send any message with notice level or below to the discord error channel.
if (process.env.NODE_ENV === 'production') {
    logger.add(new DiscordTransport({level: 'notice', format: winston.format.uncolorize()}));
}

export default logger;
