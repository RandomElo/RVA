import gestionErreur from "../../middlewares/gestionErreur.js";
import path from "path";
import fs from 'fs'
import AdmZip from "adm-zip";
import { Op } from "sequelize";

import { DOSSIER_ADHERENTS, sauvegarderEnWebp } from "../../../fonctions/utilitaires/enregistrementPhoto.js";
import { logger } from "../../../fonctions/utilitaires/logger.js";
import { supprimerFichierSiExiste } from "../../../fonctions/utilitaires/fichiers.js";
import { lireLignesCsv, mailsDesLignesCsv, validerLignesCsv } from "../../../fonctions/utilitaires/validationCsv.js";
import { creerLimiteEnvois, LIMITE_CREATIONS_COMPTE } from "../../../fonctions/mailer/limiteEnvois.js";
import { envoyerMailCreationCompte, fonctionRecupererUtilisateurs } from "./compte.js";

async function creationCompte(req, prenom, nom, mail, dateNaissance) {
    const utilisateur = await req.Utilisateurs.create({
        prenom: prenom,
        nom: nom,
        mail: mail,
        dateNaissance,
        role: "adherent"
    });
    try {
        await envoyerMailCreationCompte(req, mail, prenom, utilisateur.id)
    } catch (erreur) {
        // Permet à l'appelant de distinguer un échec d'envoi du mail d'un échec de création
        erreur.compteCree = true;
        throw erreur;
    }

}

export const ajouterPhotosZip = gestionErreur(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ etat: false, detail: "Aucune archive zip fournie." });
    }

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    const erreurs = []

    const cleUtilisateur = (prenom, nom) => JSON.stringify([prenom, nom]);
    const tousUtilisateurs = await req.Utilisateurs.findAll({ attributes: ["id", "nom", "prenom", "cheminTrombinoscope"], raw: true });
    const utilisateursParNom = new Map();
    for (const u of tousUtilisateurs) {
        const cle = cleUtilisateur(u.prenom, u.nom);
        if (!utilisateursParNom.has(cle)) utilisateursParNom.set(cle, u);
    }

    for (const entry of entries) {
        if (entry.isDirectory) continue;

        const nomOriginal = entry.entryName.split("/").pop();
        const extensionOriginale = path.extname(nomOriginal);
        const extension = extensionOriginale.toLowerCase();

        const EXTENSIONS_IMAGES = [".jpg", ".jpeg", ".png", ".webp"];
        if (!EXTENSIONS_IMAGES.includes(extension)) {
            erreurs.push(nomOriginal + " : extension interdite")
            continue
        };

        // Analyse du nom de fichier, ex: "Jean_Dupont.jpg"
        const nomSansExtension = path.basename(nomOriginal, extensionOriginale);
        const [prenom, nom] = nomSansExtension.split("_");
        const utilisateur = utilisateursParNom.get(cleUtilisateur(prenom, nom))
        if (!utilisateur) {
            erreurs.push(nomOriginal + " : utilisateur inexistant")
            continue
        }

        // Conversion en WebP comme pour l'envoi d'une photo seule (traitement séquentiel : sharp est gourmand en CPU)
        let nomFichier;
        try {
            nomFichier = await sauvegarderEnWebp(entry.getData(), DOSSIER_ADHERENTS, 80);
        } catch (err) {
            logger.warn({ type: "ZIP_TROMBINOSCOPE_IMAGE_INVALIDE", fichier: nomOriginal, erreur: err?.message }, `Image illisible dans l'archive : ${nomOriginal}`);
            erreurs.push(nomOriginal + " : image illisible ou corrompue")
            continue
        }

        try {
            await req.Utilisateurs.update({ cheminTrombinoscope: nomFichier }, { where: { id: utilisateur.id } })
        } catch (err) {
            // Sans mise à jour en base, la nouvelle photo ne serait référencée nulle part
            await fs.promises.unlink(path.join(DOSSIER_ADHERENTS, nomFichier)).catch(() => {});
            throw err;
        }
        utilisateursParNom.set(cleUtilisateur(prenom, nom), { ...utilisateur, cheminTrombinoscope: nomFichier })

        // Suppression de l'ancienne photo une fois la base à jour
        if (utilisateur.cheminTrombinoscope) {
            try {
                await supprimerFichierSiExiste(path.join(DOSSIER_ADHERENTS, utilisateur.cheminTrombinoscope));
            } catch (err) {
                // La base est déjà à jour : on journalise sans interrompre le reste de l'import
                logger.error({ type: "ZIP_TROMBINOSCOPE_SUPPRESSION_ANCIENNE_PHOTO", fichier: utilisateur.cheminTrombinoscope, erreur: err?.message }, `Ancienne photo non supprimée : ${utilisateur.cheminTrombinoscope}`);
            }
        }
    }

    return res.json({ etat: true, detail: { donnees: await fonctionRecupererUtilisateurs(req), erreurs } });
}, "ajouterPhotosZip", "Erreur lors de l'enregistrement des images pour le trombinoscope");

export const inviterAdherentCsv = gestionErreur(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte" });
    }
    const contenu = req.file.buffer.toString("utf-8");
    let lignes;
    try {
        lignes = lireLignesCsv(contenu);
    } catch {
        return res.status(400).json({ etat: false, detail: "Fichier CSV illisible." });
    }

    // Mails déjà en base, récupérés en une seule requête (comparaison exacte, comme en base)
    const emailsFichier = mailsDesLignesCsv(lignes);
    const existants = emailsFichier.length > 0
        ? await req.Utilisateurs.findAll({ where: { mail: { [Op.in]: emailsFichier } }, attributes: ["mail"], raw: true })
        : [];
    const { aCreer, erreurs } = validerLignesCsv(lignes, new Set(existants.map((u) => u.mail)));

    if (aCreer.length > 0) {
        const limite = creerLimiteEnvois(LIMITE_CREATIONS_COMPTE);
        const resultats = await Promise.allSettled(
            aCreer.map((u) => limite(() => creationCompte(req, u.prenom, u.nom, u.email, u.dateNaissance)))
        );
        resultats.forEach((resultat, index) => {
            if (resultat.status !== "rejected") return;
            const u = aCreer[index];
            const erreur = resultat.reason;
            const compteCree = erreur?.compteCree === true;
            erreurs.push(compteCree
                ? `Ligne ${u.ligne} : compte créé mais mail d'activation non envoyé (${u.email}).`
                : `Ligne ${u.ligne} : échec de la création du compte (${u.email}).`);
            logger.error({
                type: compteCree ? "INVITATION_CSV_ECHEC_MAIL" : "INVITATION_CSV_ECHEC_CREATION",
                email: u.email,
                ligne: u.ligne,
                erreur: { nom: erreur?.name, message: erreur?.message, stack: erreur?.stack }
            }, compteCree
                ? `Mail d'activation non envoyé pour ${u.email} (import CSV)`
                : `Échec de création du compte ${u.email} (import CSV)`);
        });
    }

    return res.json({ etat: true, detail: { donnees: await fonctionRecupererUtilisateurs(req), erreurs } });
}, "controleurInviterAdherentCsv", "Erreur lors des invitations");