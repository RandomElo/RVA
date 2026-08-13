import pino from 'pino';

export const logger = pino({
    level: 'info',
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
    },
});