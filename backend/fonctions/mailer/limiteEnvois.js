import pLimit from "p-limit";

// Nombre maximal d'envois de mails simultanés lors des envois groupés (newsletter, mail aux adhérents)
export const LIMITE_ENVOIS_MAIL = 10;

// Limite plus basse pour les créations de comptes : chaque tâche enchaîne deux INSERT puis un envoi de mail,
// 5 correspond à la taille par défaut du pool de connexions Sequelize
export const LIMITE_CREATIONS_COMPTE = 5;

export function creerLimiteEnvois(concurrence = LIMITE_ENVOIS_MAIL) {
    return pLimit(concurrence);
}
