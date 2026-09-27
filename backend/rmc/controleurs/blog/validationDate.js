import { dateDuJour } from "../../../fonctions/utilitaires/formaterDate.js";

// Date de publication "AAAA-MM-JJ" valide et pas antérieure au jour (Paris).
// Renvoie le message d'erreur à afficher, ou null si la date est acceptée.
export const validerDatePublicationFuture = (datePublication) => {
    const dateValide = /^\d{4}-\d{2}-\d{2}$/.test(datePublication) && !Number.isNaN(Date.parse(datePublication));
    if (!dateValide) return "Date invalide.";
    if (datePublication < dateDuJour()) return "Date déjà passée.";
    return null;
};
