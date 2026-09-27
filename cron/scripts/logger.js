// Logger JSON minimal, même format que les lignes pino du backend (level, time, type, msg).
// Pas de dépendance : l'image cron n'embarque que les scripts.
function ecrire(niveau, flux, champs, msg) {
    const ligne = { level: niveau, time: new Date().toISOString(), ...champs, msg };
    flux.write(JSON.stringify(ligne) + '\n');
}

const logger = {
    info: (champs, msg) => ecrire('INFO', process.stdout, champs, msg),
    error: (champs, msg) => ecrire('ERROR', process.stderr, champs, msg),
};

module.exports = { logger };
