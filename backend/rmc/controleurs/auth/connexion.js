import gestionErreur from "../../middlewares/gestionErreur.js";
import envoiMail from "../../../fonctions/mailer/mailer.service.js";
import { genererChaine } from "../../../fonctions/utilitaires/genererChaine.js";
import bcrypt from "bcrypt"
import { logger } from "../../../fonctions/utilitaires/logger.js";
import { ouvrirSession } from "./session.js";

async function envoiMailConnexion(req, res, utilisateur) {
    const chaine = genererChaine(10)
    await req.Tokens.create({ token: chaine, type: "lienConnexion", details: { idUtilisateur: utilisateur.id }, dateExpiration: new Date(Date.now() + 15 * 60 * 1000) })

    await envoiMail(utilisateur.mail, "Votre lien de connexion – Running Vincennes Association", "lienConnexion", {
        prenom: utilisateur.prenom,
        url: process.env.IP_FRONTEND + "/t/" + chaine
    })
    return res.json({ etat: true, detail: { compte: true, detail: "Mail envoyer" } });
}

export const verifierMotDePasse = gestionErreur(async (req, res) => {
    const { mail, mdp } = req.body;
    if (!mail || !mdp) {
        logger.warn({
            type: "AUTH_MDP_ECHEC",
            ip: req.ip,
            raison: "Champs manquants"
        }, `🔒 Tentative de vérification MDP incomplète (IP: ${req.ip})`);

        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte.",
        });
    }

    const utilisateur = await req.Utilisateurs.findOne({ where: { mail }, raw: true });
    if (!utilisateur) {
        logger.warn({
            type: "AUTH_MDP_ECHEC",
            mail,
            ip: req.ip,
            raison: "Utilisateur introuvable"
        }, `🔒 Tentative MDP pour un email inexistant : ${mail}`);

        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte.",
        });
    }

    if (utilisateur.role !== "administrateur") {
        logger.warn({
            type: "AUTH_MDP_REFUSE",
            mail,
            userId: utilisateur.id,
            role: utilisateur.role,
            ip: req.ip
        }, `🚫 Accès MDP refusé pour ${mail} (Role non admin: ${utilisateur.role})`);

        return res.status(403).json({
            etat: false,
            detail: "Accès interdit.",
        });
    }

    const mdpValide = await bcrypt.compare(mdp, utilisateur.motDePasse);
    if (!mdpValide) {
        logger.warn({
            type: "AUTH_MDP_INCORRECT",
            mail,
            ip: req.ip,
        }, `🔒 MDP incorrect : ${mail}`);

        return res.status(403).json({
            etat: false,
            detail: "Mot de passe incorrect",
        });
    }

    logger.info({
        type: "AUTH_MDP_SUCCES",
        mail,
        userId: utilisateur.id,
        ip: req.ip
    }, `🔑 Vérification MDP réussie pour l'administrateur ${mail}`);

    await envoiMailConnexion(req, res, utilisateur);

}, "controleurVerifierMotDePasse", "Erreur lors de la vérification du mot de passe");


export const verificationCode = gestionErreur(async (req, res) => {
    const { mail, code } = req.body;

    // 1. Validation de la présence des paramètres
    if (!mail || !code) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    // 2. Vérification de l'état de connexion de l'expéditeur
    if (req.idUtilisateur) {
        logger.warn({
            type: "AUTH_CODE_DEJA_AUTH",
            userId: req.idUtilisateur,
            ip: req.ip
        }, `⚠️ Tentative de validation de code par un utilisateur déjà authentifié (ID: ${req.idUtilisateur})`);

        return res.status(400).json({
            etat: true,
            detail: { token: true, detail: "Vous êtes déjà authentifié. Veuillez vous déconnecter avant de réessayer." }
        });
    }

    // 3. Recherche de l'utilisateur
    const utilisateur = await req.Utilisateurs.findOne({ where: { mail } });
    if (!utilisateur) {
        logger.warn({
            type: "AUTH_CODE_ECHEC",
            mail,
            ip: req.ip,
            raison: "Utilisateur inexistant"
        }, `🔒 Code de connexion soumis pour un mail inconnu : ${mail}`);

        return res.status(404).json({ etat: false, detail: "Utilisateur inexistant." });
    }

    // 4. Recherche du token correspondant au code fourni
    const tokenBdd = await req.Tokens.findOne({ where: { token: code } });

    if (!tokenBdd || tokenBdd.details.idUtilisateur !== utilisateur.id) {
        logger.warn({
            type: "AUTH_CODE_INVALIDE",
            mail,
            userId: utilisateur.id,
            ip: req.ip
        }, `🛑 Code ou accès invalide fourni pour ${mail}`);

        return res.json({ etat: true, detail: { token: false, detail: "Code ou accès invalide." } });
    }

    // 5. Vérification du type de token
    if (tokenBdd.type !== "codeConnexion") {
        logger.warn({
            type: "AUTH_TOKEN_MAUVAIS_TYPE",
            mail,
            typeInvoque: tokenBdd.type,
            ip: req.ip
        }, `🛑 Mauvais type de token soumis pour ${mail} (${tokenBdd.type})`);

        return res.json({ etat: true, detail: { token: false, detail: "Type de token incorrect." } });
    }

    // 6. Vérification de l'expiration
    if (tokenBdd.dateExpiration && new Date(tokenBdd.dateExpiration) < new Date()) {
        logger.warn({
            type: "AUTH_TOKEN_EXPIRE",
            mail,
            dateExpiration: tokenBdd.dateExpiration,
            ip: req.ip
        }, `⌛ Code de connexion expiré pour ${mail}`);

        return res.json({ etat: true, detail: { token: false, detail: "Le code/lien a expiré." } });
    }

    // 7. Destruction du token
    await tokenBdd.destroy();

    logger.info({
        type: "AUTH_CODE_SUCCES",
        mail,
        userId: utilisateur.id,
        ip: req.ip
    }, `🔑 Code validé avec succès pour ${mail}. Connexion établie.`);

    // 8. Génération du token de session (met aussi à jour la dernière connexion) et réponse finale
    return await ouvrirSession(req, res, utilisateur, {
        etat: true,
        detail: { token: true, detail: "Vous êtes correctement authentifié." }
    });
}, "controleurVerificationCodeUtilisateur", "Erreur lors de la vérification du code");


export const connexionParMail = gestionErreur(async (req, res) => {
    const { mail } = req.body;

    const utilisateur = await req.Utilisateurs.findOne({ where: { mail }, raw: true });
    if (!utilisateur) {
        logger.warn({
            type: "AUTH_MAIL_ECHEC",
            mail,
            ip: req.ip
        }, `🔒 Demande de connexion par mail échouée (Mail introuvable: ${mail})`);

        return res.json({ etat: true, detail: { compte: false, detail: "Mail incorrect" } });
    }

    if (utilisateur.role == "administrateur") {
        logger.info({
            type: "AUTH_MAIL_REDIRECTION_ADMIN",
            mail,
            userId: utilisateur.id,
            ip: req.ip
        }, `ℹ️ Tentative de connexion admin via mail simple pour ${mail} -> Redirection MDP`);

        return res.json({ etat: true, detail: { compte: false, detail: "Authentification supplémentaire" } });
    }

    logger.info({
        type: "AUTH_MAIL_ENVOI_CODE",
        mail,
        userId: utilisateur.id,
        ip: req.ip
    }, `📧 Mail de connexion envoyé à ${mail}`);

    await envoiMailConnexion(req, res, utilisateur);
}, "controleurConnexion", "Erreur lors de l'envoi du mail de connexion");

export const verification = gestionErreur(
    async (req, res) => {
        if (!!req.idUtilisateur) {
            const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur);
            if (!utilisateur) {
                return res.status(403).json({ etat: false, detail: "Vous n'êtes pas connecté" });
            }
            return res.json({ etat: true, detail: utilisateur.role });
        } else {
            return res.json({ etat: true, detail: false });
        }
    },
    "controleurVerficiationAuthentification",
    "Erreur lors de la vérification de l'authentification",
);

export const deconnexion = gestionErreur(async (req, res) => {
    res.clearCookie("utilisateur", {
        httpOnly: true,
        sameSite: "Strict",
        secure: process.env.MODE == "production",
    });

    return res.json({ etat: true, detail: "ok" });
}, "controleurDeconnexion", "Erreur lors de la déconnexion de l'utilisateur")