import gestionErreur from "../../middlewares/gestionErreur.js";
import { logger } from "../../../fonctions/utilitaires/logger.js";

export const connexionGoogle = gestionErreur(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        logger.warn({
            type: "AUTH_GOOGLE_ECHEC",
            ip: req.ip,
            raison: "Jeton absent"
        }, `🔒 Tentative de connexion Google sans token (IP: ${req.ip})`);

        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte. Jeton manquant.",
        });
    }

    const clientIdGoogle = process.env.GOOGLE_CLIENT_ID;
    if (!clientIdGoogle) {
        logger.error({
            type: "AUTH_GOOGLE_CONFIGURATION",
            ip: req.ip
        }, "❌ GOOGLE_CLIENT_ID absent : connexion Google refusée");

        return res.status(401).json({
            etat: false,
            detail: "Jeton Google invalide ou expiré.",
        });
    }

    // 1. Validation du jeton d'accès auprès de Google
    let payload;
    try {
        // Le jeton doit avoir été émis pour notre application (sinon substitution de jeton possible)
        const reponseTokeninfo = await fetch("https://oauth2.googleapis.com/tokeninfo", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ access_token: token }).toString()
        });

        if (!reponseTokeninfo.ok) {
            throw new Error("Jeton Google invalide.");
        }

        const infosJeton = await reponseTokeninfo.json();

        if (infosJeton?.aud !== clientIdGoogle || (infosJeton.azp && infosJeton.azp !== clientIdGoogle)) {
            throw new Error("Jeton Google émis pour une autre application.");
        }

        if (!(Number(infosJeton.expires_in) > 0)) {
            throw new Error("Jeton Google expiré.");
        }

        const reponseGoogle = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!reponseGoogle.ok) {
            throw new Error("Jeton Google invalide.");
        }

        payload = await reponseGoogle.json();

        if ((infosJeton.sub && infosJeton.sub !== payload?.sub) || (infosJeton.email && infosJeton.email !== payload?.email)) {
            throw new Error("Identité Google incohérente entre tokeninfo et userinfo.");
        }
    } catch (erreur) {
        logger.warn({
            type: "AUTH_GOOGLE_TOKEN_INVALIDE",
            ip: req.ip,
            erreur: erreur.message
        }, `🛑 Validation du jeton Google échouée (IP: ${req.ip})`);

        return res.status(401).json({
            etat: false,
            detail: "Jeton Google invalide ou expiré.",
        });
    }

    if (!payload || !payload.email_verified) {
        logger.warn({
            type: "AUTH_GOOGLE_EMAIL_NON_VERIFIE",
            email: payload?.email || "inconnu",
            ip: req.ip
        }, `🛑 Tentative de connexion avec un email Google non vérifié`);

        return res.status(401).json({
            etat: false,
            detail: "L'adresse e-mail Google n'est pas vérifiée.",
        });
    }

    const { sub: googleId, email } = payload;

    // 2. Recherche de l'utilisateur dans la base de données
    const utilisateur = await req.Utilisateurs.findOne({ where: { mail: email } });

    if (!utilisateur) {
        logger.warn({
            type: "AUTH_GOOGLE_EMAIL_REFUSE",
            email,
            googleId,
            ip: req.ip
        }, `🚫 Email Google non autorisé en BDD : ${email}`);

        return res.status(403).json({
            etat: false,
            detail: "Cette adresse e-mail n'est pas autorisée.",
        });
    }

    // 3. Sécurité Administrateur : Vérification de la liaison du compte
    if (utilisateur.role === "administrateur") {
        if (!utilisateur.googleId) {
            logger.info({
                type: "AUTH_GOOGLE_LIAISON_ADMIN",
                email,
                userId: utilisateur.id,
                googleId
            }, `🔗 Premier couplage du compte Google Admin pour ${email}`);

            await utilisateur.update({ googleId });
        }
        else if (utilisateur.googleId !== googleId) {
            logger.error({
                type: "AUTH_GOOGLE_DESYNCHRO_ADMIN",
                email,
                userId: utilisateur.id,
                googleIdBdd: utilisateur.googleId,
                googleIdRecu: googleId,
                ip: req.ip
            }, `🚨 Discordance d'ID Google pour l'administrateur ${email}`);

            return res.status(403).json({
                etat: false,
                detail: "Ce compte Google ne correspond pas à l'identifiant administrateur enregistré.",
            });
        }
    }

    logger.info({
        type: "AUTH_GOOGLE_SUCCES",
        email,
        userId: utilisateur.id,
        role: utilisateur.role,
        ip: req.ip
    }, `🔑 Connexion Google réussie pour ${email}`);

    // 4. Génération du jeton d'application
    return await req.Utilisateurs.generationToken(req, res, utilisateur, {
        etat: true,
        detail: { token: true, detail: "Vous êtes correctement authentifié." },
    });

}, "controleurConnexionGoogle", "Erreur lors de la connexion avec Google");