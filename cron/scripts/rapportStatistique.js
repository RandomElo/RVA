const { logger } = require('./logger');

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8100';

async function rapportStatistique() {
    try {
        const res = await fetch(`${BACKEND_URL}/statistiques/mail-rapport`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Ajoute un secret partagé si cette route interne doit être protégée
                'X-Internal-Secret': process.env.INTERNAL_SECRET || '',
            },
        });

        if (!res.ok) {
            throw new Error(`Backend a répondu ${res.status}`);
        }

        const data = await res.json();
        logger.info({ type: 'CRON_RAPPORT_STATISTIQUE', resultat: data }, 'Tâche mensuelle exécutée avec succès');
    } catch (err) {
        logger.error({ type: 'CRON_RAPPORT_STATISTIQUE', erreur: err.message }, 'Échec de la tâche mensuelle');
        process.exit(1);
    }
}

rapportStatistique();