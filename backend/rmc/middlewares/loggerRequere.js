import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../fonctions/utilitaires/logger.js';

export const loggerRequete = pinoHttp({
    logger,
    genReqId: (req, res) => {
        const id = req.headers['x-request-id'] || uuidv4();
        res.setHeader('X-Request-Id', id); // On le renvoie aussi dans les headers de réponse HTTP
        return id;
    },

    autoLogging: {
        ignore: (req) => req.url === '/autres/health-check',
    },

    customSuccessMessage: (req, res, responseTime) => {
        if (responseTime > 500) {
            logger.warn({
                type: 'REQUETE_LENTE',
                dureeMs: responseTime,
                url: req.url,
                method: req.method,
                userId: req.idUtilisateur || null
            }, `⚠️ Requête lente détectée (${responseTime}ms)`);
        }
        return `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
    },

    redact: ['req.headers.authorization', 'req.headers.cookie'],

    // Évalué au moment où le log s'écrit (à la fin de la réponse)
    customProps: (req) => ({
        userId: req.idUtilisateur || req.user?.id || null,
    }),
});