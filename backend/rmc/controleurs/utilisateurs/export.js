import gestionErreur from "../../middlewares/gestionErreur.js";
import path from "path";
import fs from 'fs'
import { ZipArchive } from "archiver";

import { cheminDossierAdherents } from "./compte.js";

export const exporterDonnees = gestionErreur(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte.",
        });
    }
    const utilisateur = await req.Utilisateurs.findByPk(id, {
        attributes: ["prenom", "nom", "mail", "dateNaissance", "role", "cheminTrombinoscope", "derniereConnexion", "recevoirNewsletter", "dateCreation"],
        raw: true
    })
    if (!utilisateur) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" })
    }
    const cheminPhoto = utilisateur.cheminTrombinoscope ? path.join(cheminDossierAdherents, utilisateur.cheminTrombinoscope) : null;

    // On retire le chemin du fichier
    const { cheminTrombinoscope, ...donnees } = utilisateur;

    const csv = [Object.keys(donnees).join(";"), Object.values(donnees).join(";"),].join("\n");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${utilisateur.prenom}_${utilisateur.nom}.zip"`);


    const archive = new ZipArchive({ zlib: { level: 9 }, });

    archive.pipe(res);

    archive.append(csv, { name: "donnees.csv", });

    if (cheminPhoto && fs.existsSync(cheminPhoto)) {
        archive.file(cheminPhoto, {
            name: path.basename(cheminPhoto),
        });
    }

    await archive.finalize();
}, "controleurExporterDonnees", "Erreur lors de l'exportation des données de l'utilisateur")