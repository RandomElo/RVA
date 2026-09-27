import gestionErreur from "../../middlewares/gestionErreur.js";
import path from "path";

import { REGEX_DATE_NAISSANCE, REGEX_NOM } from "../../../fonctions/utilitaires/validation.js";
import { supprimerFichierSiExiste } from "../../../fonctions/utilitaires/fichiers.js";
import { cheminDossierAdherents, envoyerMailCreationCompte, fonctionRecupererUtilisateurs } from "./compte.js";
import { logger } from "../../../fonctions/utilitaires/logger.js";

async function verificationInformationsAdherent(req, res) {
    // Présence des quatre champs vérifiée par validerCorps dans le routeur
    const { prenom, nom, mail, dateNaissance } = req.body

    const regexMail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regexMail.test(mail)) {
        return res.json({ etat: true, detail: { inviter: "erreur", detail: "Les informations d'authentification ne respectent pas les règles définies." } });
    }

    if (!REGEX_NOM.test(nom) || !REGEX_NOM.test(prenom)) {
        return res.json({ etat: true, detail: { inviter: "erreur", detail: "Les informations de compte ne respectent pas les règles définies." } });
    }

    if (!REGEX_DATE_NAISSANCE.test(dateNaissance)) {
        return res.json({ etat: true, detail: { inviter: "erreur", detail: "Les informations de compte ne respectent pas les règles définies." } });
    }


    return { prenom, nom, mail, dateNaissance }
}

export const recupererUtilisateurs = gestionErreur(async (req, res) => {
    await fonctionRecupererUtilisateurs(req, res)
}, "controleurRecupererUtilisateurs", "Erreur lors de la récupération des utilisateurs")

export const inviterAdherent = gestionErreur(async (req, res) => {
    const { prenom, nom, mail, dateNaissance } = await verificationInformationsAdherent(req, res)
    if (prenom) {
        const utilisateur = await req.Utilisateurs.findOne({ where: { mail } })
        if (utilisateur) {
            return res.json({ etat: true, detail: { inviter: "erreur", detail: "Mail déjà existant." } });
        }

        const nouvelUtilisateur = await req.Utilisateurs.create({
            prenom,
            nom,
            mail,
            dateNaissance,
            role: "adherent"
        })

        try {
            await envoyerMailCreationCompte(req, mail, prenom, nouvelUtilisateur.id)
        } catch (erreur) {
            // Le compte existe déjà : l'admin doit passer par « relancer » plutôt que réinviter
            logger.error({ type: "INVITATION_ECHEC_MAIL", mail, erreur: erreur?.message }, "Compte créé mais mail d'activation non envoyé");
            const donnees = await fonctionRecupererUtilisateurs(req)
            return res.json({ etat: true, detail: { inviter: "avertissement", detail: "Compte créé mais l'envoi du mail a échoué. Utilisez « relancer » pour renvoyer l'invitation.", donnees } });
        }
        await fonctionRecupererUtilisateurs(req, res)
    }

}, "controleurInviterAdherent", "Erreur lors de l'invitation de l'adhérent")

export const trombinoscope = gestionErreur(async (req, res) => {
    const utilisateurs = await req.Utilisateurs.findAll({
        where: { role: "adherent" },
        attributes: ["prenom", "nom", "cheminTrombinoscope"],
        raw: true
    })

    return res.json({ etat: true, detail: utilisateurs })
}, "controleurTrombinoscope", "Erreur lors de la récupération du trombinoscope")

export const supprimer = gestionErreur(async (req, res) => {
    const { nom } = req.body

    const utilisateur = await req.Utilisateurs.findOne({ where: { mail: nom }, raw: true })
    if (!utilisateur) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }

    if (utilisateur.cheminTrombinoscope) {
        const cheminFichier = path.join(
            cheminDossierAdherents,
            utilisateur.cheminTrombinoscope
        );

        await supprimerFichierSiExiste(cheminFichier);
    }
    await req.Utilisateurs.destroy({ where: { mail: nom } })
    await fonctionRecupererUtilisateurs(req, res)
}, "controleurSupprimer", "Erreur lors de la suppression de l'utilisateur")

export const modifierInformationsUtilisateur = gestionErreur(async (req, res) => {
    const { prenom, nom, mail, dateNaissance } = await verificationInformationsAdherent(req, res)
    if (prenom) {
        const [nbModifies] = await req.Utilisateurs.update({ prenom, nom, mail, dateNaissance }, { where: { mail } })
        if (nbModifies === 0) {
            return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
        }
        await fonctionRecupererUtilisateurs(req, res)
    }
}, "controleurModifierInfosUtilisateur", "Erreur lors de la modification des données de l'utilisateur")

export const relancerInitialisationCompte = gestionErreur(async (req, res) => {
    const { mail } = req.body;

    if (!mail) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    const utilisateur = await req.Utilisateurs.findOne({ where: { mail }, raw: true })
    if (!utilisateur) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }

    const token = await req.Tokens.findOne({ where: { type: "lienConnexion", details: { "idUtilisateur": utilisateur.id } } })
    if (token) {
        return res.json({ etat: true, detail: { mail: false, detail: "L'utilisateur a déjà reçu un mail il y a moins de 24h." } })
    } else {
        await envoyerMailCreationCompte(req, mail, utilisateur.prenom, utilisateur.id)
        return res.json({ etat: true, detail: { mail: true, detail: "Mail envoyé avec succès" } })
    }

}, "controleruRelancerInitialisationCompte", "Erreur lors de l'envoi du mail de relance")