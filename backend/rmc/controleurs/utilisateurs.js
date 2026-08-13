import gestionErreur from "../middlewares/gestionErreur.js";
import envoiMail from "../../fonctions/mailer/mailer.service.js";
import { genererChaine } from "../../fonctions/utilitaires/genererChaine.js";
import path from "path";
import { parse } from "csv-parse/sync";
import fs from 'fs'
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";
import AdmZip from "adm-zip";
import { ZipArchive } from "archiver";


import { DOSSIER_ADHERENTS, DOSSIER_GALERIE, sauvegarderEnWebp } from "../../fonctions/utilitaires/enregistrementPhoto.js";
import { logger } from "../../fonctions/utilitaires/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cheminDossierAdherents = path.resolve(__dirname, "../../medias/adherents");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Fonctions BDD
async function fonctionRecupererUtilisateurs(req, res = null) {
    const utilisateurs = await req.Utilisateurs.findAll({
        where: { role: "adherent" },
        attributes: ["id", "prenom", "nom", "mail", "cheminTrombinoscope", "derniereConnexion"],
        order: [["derniereConnexion", "ASC"]],
        raw: true
    })
    if (!res) return utilisateurs
    return res.json({ etat: true, detail: utilisateurs })
}

async function verificationInformationsAdherent(req, res) {
    const { prenom, nom, mail } = req.body

    if (!prenom || !nom || !mail) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const regexMail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regexMail.test(mail)) {
        return res.json({ etat: true, detail: { inviter: "erreur", detail: "Les informations d'authentification ne respectent pas les règles définies." } });
    }

    const regexNom = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
    if (!regexNom.test(nom) || !regexNom.test(prenom)) {
        return res.json({ etat: true, detail: { inviter: "erreur", detail: "Les informations de compte ne respectent pas les règles définies." } });
    }


    return { prenom, nom, mail }
}

async function envoyerMailCreationCompte(req, mail, prenom, idUtilisateur) {
    const chaine = genererChaine(10);
    await req.Tokens.create({
        token: chaine,
        type: "lienConnexion",
        details: { idUtilisateur },
        dateExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    envoiMail(mail, "Activation du compte – Running Vincennes Association", "creationCompte", {
        prenom: prenom,
        url: process.env.IP_FRONTEND + "/t/" + chaine
    });
}

async function creationCompte(req, prenom, nom, mail) {
    const utilisateur = await req.Utilisateurs.create({
        prenom: prenom,
        nom: nom,
        mail: mail,
        role: "adherent"
    });
    envoyerMailCreationCompte(req, mail, prenom, utilisateur.id)

}

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

    // 8. Mise à jour de la dernière connexion
    await utilisateur.update({ derniereConnexion: new Date() });

    logger.info({
        type: "AUTH_CODE_SUCCES",
        mail,
        userId: utilisateur.id,
        ip: req.ip
    }, `🔑 Code validé avec succès pour ${mail}. Connexion établie.`);

    // 9. Génération du token de session et réponse finale
    return await req.Utilisateurs.generationToken(req, res, utilisateur, {
        etat: true,
        detail: { token: true, detail: "Vous êtes correctement authentifié." }
    });
}, "controleurVerificationCodeUtilisateur", "Erreur lors de la vérification du code");


export const connexionParMail = gestionErreur(async (req, res) => {
    const { mail } = req.body;
    if (!mail) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

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

    // 1. Validation du jeton ID auprès de Google
    let payload;
    try {
        const reponseGoogle = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!reponseGoogle.ok) {
            throw new Error("Jeton Google invalide.");
        }

        payload = await reponseGoogle.json();
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

export const verification = gestionErreur(
    async (req, res) => {
        if (!!req.idUtilisateur) {
            const { role } = await req.Utilisateurs.findByPk(req.idUtilisateur);
            return res.json({ etat: true, detail: role });
        } else {
            return res.json({ etat: true, detail: false });
        }
    },
    "controleurVerficiationAuthentification",
    "Erreur lors de la vérification de l'authentification",
);

export const recupererUtilisateurs = gestionErreur(async (req, res) => {
    await fonctionRecupererUtilisateurs(req, res)
}, "controleurRecupererUtilisateurs", "Erreur lors de la récupération des utilisateurs")

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

        try {
            await fs.promises.unlink(cheminAncienFichier);
        } catch (err) {
            if (err.code !== "ENOENT") { // Ignore l'erreur si le fichier physique était déjà absent
                throw err;
            }
        }
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

    if (!nomFichier) {
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

    const chemin = path.resolve(__dirname, "../../medias/adherents", nomFichier);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");

    res.sendFile(chemin);

}, "controleurPhotoAdherent", "Erreur lors de la récupération de la photo de l'adhérent")

export const inviterAdherent = gestionErreur(async (req, res) => {
    const { prenom, nom, mail } = await verificationInformationsAdherent(req, res)
    if (prenom) {
        const utilisateur = await req.Utilisateurs.findOne({ where: { mail } })
        if (utilisateur) {
            return res.json({ etat: true, detail: { inviter: "erreur", detail: "Mail déjà existant." } });
        }

        const nouvelUtilisateur = await req.Utilisateurs.create({
            prenom,
            nom,
            mail,
            motDePasse: "0000000",
            role: "adherent"
        })

        const chaine = genererChaine(10)
        await req.Tokens.create({
            token: chaine,
            type: "lienConnexion",
            details: { idUtilisateur: nouvelUtilisateur.id },
            dateExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })
        await envoiMail(mail, "Activation du compte – Running Vincennes Association", "creationCompte", {
            prenom: prenom,
            url: process.env.IP_FRONTEND + "/t/" + chaine
        })
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
    if (!nom) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const utilisateur = await req.Utilisateurs.findOne({ where: { mail: nom }, raw: true })
    if (!utilisateur) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    if (utilisateur.cheminTrombinoscope) {
        const cheminFichier = path.join(
            cheminDossierAdherents,
            utilisateur.cheminTrombinoscope
        );

        try {
            await fs.promises.unlink(cheminFichier);
        } catch (err) {
            if (err.code !== "ENOENT") {
                throw err;
            }
        }
    }
    await req.Utilisateurs.destroy({ where: { mail: nom } })
    await fonctionRecupererUtilisateurs(req, res)
}, "controleurSupprimer", "Erreur lors de la suppression de l'utilisateur")

export const ajouterPhotosZip = gestionErreur(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ etat: false, detail: "Aucune archive zip fournie." });
    }

    const DOSSIER_TEMP = path.join(process.cwd(), "medias", "temp");

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    const photosEnAttente = [];
    const erreurs = []
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
        const utilisateur = await req.Utilisateurs.findOne({ where: { nom, prenom }, raw: true })
        if (!utilisateur) {
            erreurs.push(nomOriginal + " : utilisateur inexistant")
            continue
        }
        const nomFichier = `${randomUUID()}${extension}`;

        fs.writeFileSync(path.join(DOSSIER_ADHERENTS, nomFichier), entry.getData());
        await req.Utilisateurs.update({ cheminTrombinoscope: nomFichier }, { where: { id: utilisateur.id } })

    }

    return res.json({ etat: true, detail: { donnees: await fonctionRecupererUtilisateurs(req), erreurs } });
}, "ajouterPhotosZip", "Erreur lors de l'enregistrement des images pour le trombinoscope");

export const inviterAdherentCsv = gestionErreur(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte" });
    }
    const contenu = req.file.buffer.toString("utf-8");
    const lignes = parse(contenu, { delimiter: ";", trim: true, skip_empty_lines: true });

    const aCreer = [];
    const erreurs = [];

    for (let i = 0; i < lignes.length; i++) {
        const ligne = lignes[i];
        if (ligne.length !== 3) {
            erreurs.push(`Ligne ${i + 1} : le format doit être "Prénom;Nom;Adresse mail".`);
            continue;
        }

        const [prenom, nom, email] = ligne;

        if (!prenom || !nom || !email) {
            erreurs.push(`Ligne ${i + 1} : une ou plusieurs colonnes sont vides.`);
            continue;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            erreurs.push(`Ligne ${i + 1} : l'adresse email "${email}" est invalide.`);
            continue;
        }

        const utilisateur = await req.Utilisateurs.findOne({ where: { mail: email }, raw: true });
        if (utilisateur) {
            erreurs.push(`Ligne ${i + 1} : utilisateur déjà existant (${email}).`);
            continue;
        }

        if (aCreer.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            erreurs.push(`Ligne ${i + 1} : adresse email en double dans le fichier (${email}).`);
            continue;
        }

        aCreer.push({ prenom, nom, email });
    }
    if (aCreer.length > 0) {
        await Promise.allSettled(
            aCreer.map(async (u) => await creationCompte(req, u.prenom, u.nom, u.email))
        );
    }

    return res.json({ etat: true, detail: { donnees: await fonctionRecupererUtilisateurs(req), erreurs } });
}, "controleurInviterAdherentCsv", "Erreur lors des invitations");

export const modifierInformationsUtilisateur = gestionErreur(async (req, res) => {
    const { prenom, nom, mail } = await verificationInformationsAdherent(req, res)
    if (prenom) {
        await req.Utilisateurs.update({ prenom, nom, mail }, { where: { mail } })
        await fonctionRecupererUtilisateurs(req, res)
    }
}, "controleurModifierInfosUtilisateur", "Erreur lors de la modification des données de l'utilisateur")

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

        try {
            await fs.promises.unlink(cheminFichier);
        } catch (err) {
            if (err.code !== "ENOENT") {
                throw err;
            }
        }
    }
    await req.Utilisateurs.update({ cheminTrombinoscope: "" }, { where: { id } })
    await fonctionRecupererUtilisateurs(req, res)
}, "controleurSupprimerPhoto", "Erreur lors de la photo")

export const exporterDonnees = gestionErreur(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte.",
        });
    }
    const utilisateur = await req.Utilisateurs.findByPk(id, {
        attributes: ["prenom", "nom", "mail", "role", "cheminTrombinoscope", "derniereConnexion", "recevoirNewsletter", "dateCreation"],
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

export const deconnexion = gestionErreur(async (req, res) => {
    res.clearCookie("utilisateur", {
        httpOnly: true,
        sameSite: "Strict",
        secure: process.env.MODE == "production",
    });

    return res.json({ etat: true, detail: "ok" });
}, "controleurDeconnexion", "Erreur lors de la déconnexion de l'utilisateur")

export const relancerInitialisationCompte = gestionErreur(async (req, res) => {
    const { mail } = req.body;

    if (!mail) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    const utilisateur = await req.Utilisateurs.findOne({ where: { mail }, raw: true })
    if (!utilisateur) {
        return res.status(404).json({ etat: false, detail: "Utilisateur inexistant." });
    }

    const token = await req.Tokens.findOne({ where: { type: "lienConnexion", details: { "idUtilisateur": utilisateur.id } } })
    if (token) {
        return res.json({ etat: true, detail: { mail: false, detail: "L'utilisateur a déjà reçu un mail il y a moins de 24h." } })
    } else {
        envoyerMailCreationCompte(req, mail, utilisateur.prenom, utilisateur.id)
        return res.json({ etat: true, detail: { mail: true, detail: "Mail envoyé avec succès" } })
    }

}, "controleruRelancerInitialisationCompte", "Erreur lors de l'envoi du mail de relance")