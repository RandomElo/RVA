import envoiMail from "../../fonctions/mailer/mailer.service.js";
import gestionErreur from "../middlewares/gestionErreur.js";

async function enregistrerSpecialistes(req, res, mode) {
    const { nom, specialite, detail, adresse, telephone, lienReservation } = req.body;

    if (!nom || !specialite || !detail || !adresse) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const SPECIALITES_AUTORISEES = [
        "kine_sport",
        "kine",
        "podologue",
        "osteopathe",
        "medecin_sport",
    ];

    // Spécialité
    if (!SPECIALITES_AUTORISEES.includes(specialite)) {
        return res.json({
            etat: true,
            detail: { specialiste: false, detail: "Spécialité invalide." },
        });
    }

    // Téléphone (facultatif)
    const REGEX_TELEPHONE = /^(0|\+33\s?)[1-9](\s?\d{2}){4}$/;
    if (telephone != null && telephone !== "" && !REGEX_TELEPHONE.test(telephone.replace(/[.\-]/g, " ").trim())) {
        return res.json({
            etat: true,
            detail: { specialiste: false, detail: "Numéro de téléphone invalide." },
        });
    }

    // Lien de réservation (facultatif)
    if (lienReservation != null && lienReservation !== "" && !estUrl(lienReservation)) {
        return res.json({
            etat: true,
            detail: { specialiste: false, detail: "Le lien de réservation est invalide." },
        });
    }

    const donnees = {
        etat: mode == "suggestion" ? "suggestion" : "valider",
        nom,
        specialite,
        detail,
        adresse,
        telephone: telephone || null,
        lienReservation: lienReservation || null,
    };

    if (mode == "creation" || mode == "suggestion") {
        await req.Specialistes.create(donnees);
    } else {
        await req.Specialistes.update(donnees, { where: { nom } });
    }

    if (mode == "modification") {
        return res.json({
            etat: true,
            detail: {
                specialiste: true,
                detail: await recupererTousLesSpecialistesAdmin(req),
                notification: "Spécialiste modifié avec succès !",
            },
        });

    } else if (mode !== "suggestion") {
        return res.json({
            etat: true,
            detail: {
                specialiste: true,
                detail: await recupererTousLesSpecialistes(req),
                notification: mode == "creation" ? "Spécialiste créé avec succès !" : "Spécialiste modifié avec succès !",
            },
        });
    }
}

async function recupererTousLesSpecialistes(req) {
    return await req.Specialistes.findAll({
        where: { etat: "valider" },
        attributes: ["nom", "specialite", "detail", "adresse", "telephone", "lienReservation"],
        raw: true
    });
}

async function recupererTousLesSpecialistesAdmin(req) {
    return await req.Specialistes.findAll({
        attributes: ["nom", "specialite", "detail", "adresse", "telephone", "lienReservation", "etat"],
        raw: true
    });
}

export const recuperer = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererTousLesSpecialistes(req) })
}, "controleurRecuperationSpecialistes", "Erreur lors de la récupération des spécialistes")

export const recupererAdmin = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererTousLesSpecialistesAdmin(req) })
}, "controleurRecuperationSpecialistesAdmin", "Erreur lors de la récupération des spécialistes")

export const cree = gestionErreur(async (req, res) => {
    await enregistrerSpecialistes(req, res, "creation")
}, "controleurCree", "Erreur lors de la création du spécialiste");

export const modifierSpecialiste = gestionErreur(async (req, res) => {
    await enregistrerSpecialistes(req, res, "modification");
}, "controleurModifierSpecialiste", "Erreur lors de la modification du spécialiste");

export const suggestion = gestionErreur(async (req, res) => {
    const donnees = await enregistrerSpecialistes(req, res, "suggestion");
    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true });

    await envoiMail(process.env.EMAIL_ADMINISTRATEUR, "Proposition d'ajout d'un spécialiste de santé – Running Vincennes Association", "suggestionSpecialiste", {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        details: req.body,
        url: process.env.IP_FRONTEND + "/administration/specialistes"
    })

    return res.json({
        etat: true,
        detail: {
            specialiste: true,
            detail: await recupererTousLesSpecialistes(req),
            notification: "Votre suggestion a bien été envoyée.",
        },
    });
}, "controleurSuggestionSpecialiste", "Erreur lors de la suggestion du spécialiste");
export const supprimer = gestionErreur(async (req, res) => {
    const { nom } = req.body
    if (!nom) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const specialiste = await req.Specialistes.findOne({ where: { nom: nom }, raw: true })
    if (!specialiste) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }
    await req.Specialistes.destroy({ where: { nom: nom } })
    await res.json({ etat: true, detail: await recupererTousLesSpecialistesAdmin(req) })
}, "controleurSupprimerSpecialiste", "Erreur lors de la suppression du spécialisate de santé.")