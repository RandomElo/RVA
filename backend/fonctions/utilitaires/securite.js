import { createHash, timingSafeEqual } from "crypto";

/**
 * Compare deux secrets en temps constant (évite les attaques temporelles).
 * Les deux valeurs sont hachées avant comparaison : les tampons ont toujours la même
 * longueur, et la durée ne dépend ni du contenu ni de la longueur du secret attendu.
 * @param {unknown} recu - Valeur reçue (ex. en-tête HTTP)
 * @param {unknown} attendu - Valeur de référence (ex. variable d'environnement)
 * @returns {boolean} - false si l'une des valeurs est absente, vide ou n'est pas une chaîne
 */
export function secretsEgaux(recu, attendu) {
    if (typeof recu !== "string" || typeof attendu !== "string" || !recu || !attendu) {
        return false;
    }

    const empreinteRecue = createHash("sha256").update(recu).digest();
    const empreinteAttendue = createHash("sha256").update(attendu).digest();

    return timingSafeEqual(empreinteRecue, empreinteAttendue);
}