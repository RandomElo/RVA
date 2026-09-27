import fs from "fs/promises";

// Supprime un fichier du disque, sans erreur s'il était déjà absent (ENOENT). Les autres erreurs sont propagées.
export async function supprimerFichierSiExiste(chemin) {
    try {
        await fs.unlink(chemin);
    } catch (err) {
        if (err.code !== "ENOENT") {
            throw err;
        }
    }
}
