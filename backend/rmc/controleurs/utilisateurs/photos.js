import gestionErreur from "../../middlewares/gestionErreur.js";
import path from "path";

import { DOSSIER_ADHERENTS, sauvegarderEnWebp } from "../../../fonctions/utilitaires/enregistrementPhoto.js";
import { estNomFichierSur } from "../../../fonctions/utilitaires/validation.js";
import { supprimerFichierSiExiste } from "../../../fonctions/utilitaires/fichiers.js";
import { cheminDossierAdherents, fonctionRecupererUtilisateurs } from "./compte.js";

export const enregistrerPhotoControleur = gestionErreur(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ erreur: "Aucun fichier reçu" });
    }

    const utilisateur = await req.Utilisateurs.findByPk(req.params.id, { raw: true });

    if (!utilisateur) {
        return res.status(404).json({
            etat: false,
            detail: "Utilisateur introuvable",
        });
    }

    // 1. Conversion et sauvegarde du nouveau fichier WebP
    const nomFichierWebp = await sauvegarderEnWebp(req.file.buffer, DOSSIER_ADHERENTS, 80);

    // 2. Suppression de l'ancienne photo sur le disque si elle existe
    if (utilisateur.cheminTrombinoscope) {
        const cheminAncienFichier = path.join(
            DOSSIER_ADHERENTS,
            utilisateur.cheminTrombinoscope
        );

        await supprimerFichierSiExiste(cheminAncienFichier);
    }

    // 3. Mise à jour DANS TOUS LES CAS de la BDD avec le nouveau nom de fichier
    await req.Utilisateurs.update(
        { cheminTrombinoscope: nomFichierWebp },
        { where: { id: utilisateur.id } }
    );

    await fonctionRecupererUtilisateurs(req, res);

}, "controleurEnregistrerPhotoControleur", "Erreur lors de l'enregistrement de la photo");

export const photo = gestionErreur(async (req, res) => {
    const { nomFichier } = req.params

    if (!estNomFichierSur(nomFichier)) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    if (!req.idUtilisateur) {
        return res.status(403).json({
            etat: false,
            detail: "Accès interdit",
        });
    }

    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");

    res.sendFile(nomFichier, { root: cheminDossierAdherents }, (erreur) => {
        if (erreur && !res.headersSent) {
            res.removeHeader("Cache-Control");
            res.status(erreur.status === 404 ? 404 : 500).json({ etat: false, detail: "Photo introuvable" });
        }
    });

}, "controleurPhotoAdherent", "Erreur lors de la récupération de la photo de l'adhérent")

export const supprimerPhoto = gestionErreur(async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte.",
        });
    }
    const utilisateur = await req.Utilisateurs.findByPk(id, { raw: true })
    if (!utilisateur) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" })
    }

    if (utilisateur.cheminTrombinoscope) {
        const cheminFichier = path.join(
            cheminDossierAdherents,
            utilisateur.cheminTrombinoscope
        );

        await supprimerFichierSiExiste(cheminFichier);
    }
    await req.Utilisateurs.update({ cheminTrombinoscope: "" }, { where: { id } })
    await fonctionRecupererUtilisateurs(req, res)
}, "controleurSupprimerPhoto", "Erreur lors de la photo")