import envoiMail from "../../fonctions/mailer/mailer.service.js";
import gestionErreur from "../middlewares/gestionErreur.js";

// Fonctions utilitaires

const estDate = (date) => {
    if (typeof date !== "string") return false;

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;

    const d = new Date(date);

    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(date);
};

const estUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Fonctions BDD

async function enregistrerCourses(req, res, mode) {
    const { nom, date, lieu, distance, type, lienWhatsapp, lienSite, lienInscription, inscriptionsOuvertes, dateOuvertureInscription } = req.body;


    if (!nom || !date || !lieu || !type || typeof inscriptionsOuvertes !== "boolean") {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const TYPES_AUTORISES = [
        "5km",
        "10km",
        "Semi",
        "Marathon",
        "Route",
        "Trail",
    ];

    // Date
    if (!estDate(date)) {
        return res.json({
            etat: true,
            detail: { course: false, detail: "Date invalide." },
        });
    }

    if (new Date(date) < new Date()) {
        return res.json({
            etat: true,
            detail: { course: false, detail: "Date invalide." },
        });
    }
    // Date d'ouverture (facultative)
    if (dateOuvertureInscription && (!estDate(dateOuvertureInscription) || new Date(dateOuvertureInscription) < new Date())) {
        return res.json({
            etat: true,
            detail: {
                course: false,
                detail: "Date d'ouverture des inscriptions invalide.",
            },
        });
    }

    // Type
    if (!TYPES_AUTORISES.includes(type)) {
        return res.json({
            etat: true,
            detail: { course: false, detail: "Type de course invalide." },
        });
    }

    // URLs
    for (const url of [lienWhatsapp, lienSite, lienInscription]) {
        if (url != null && url !== "" && !estUrl(url)) {
            return res.json({
                etat: true,
                detail: { course: false, detail: "Un des liens est invalide." },
            });
        }
    }

    // Distance
    if (type === "Route" || type === "Trail") {
        const valeur = Number(distance);

        if (!Number.isFinite(valeur)) {
            return res.json({
                etat: true,
                detail: { course: false, detail: "La distance doit être un nombre." },
            });
        }
    }
    const donnees = {
        etat: mode == "suggestion" ? "suggestion" : "valider",
        nom,
        date,
        lieu,
        distance: distance || null,
        type,
        lienWhatsapp: lienWhatsapp || null,
        lienSite: lienSite || null,
        lienInscription: lienInscription || null,
        inscriptionsOuvertes,
        dateOuvertureInscription: dateOuvertureInscription || null,
    }
    if (mode == "creation" || mode == "suggestion") {
        await req.Courses.create(donnees);
    } else {
        await req.Courses.update(donnees, { where: { nom } })
    }

    if (mode !== "suggestion") {
        return res.json({ etat: true, detail: { course: true, detail: await recupererToutesLesCourses(req), notification: mode == "creation" ? "Course crée avec succès !" : "Course modifiée avec succès !" } })
    }
}

async function recupererToutesLesCourses(req, admin = false) {
    return await req.Courses.findAll({
        ...(!admin ? { where: { etat: "valider" } } : {}),
        attributes: ["nom", "date", "lieu", "distance", "type", ...(req.idUtilisateur ? ["lienWhatsapp"] : []), "lienSite", "lienInscription", "inscriptionsOuvertes", "dateOuvertureInscription", ...(admin ? ["etat"] : []),],
        order: [["date", "ASC"]],
        raw: true
    })
}

export const cree = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await enregistrerCourses(req, res, "creation") })
}, "controleurCree", "Erreur lors de la création de la course");


export const toutesLesCourses = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererToutesLesCourses(req) })
}, "controleurToutesLesCourses", "Erreur lors de la récupération des courses")

export const supprimerCourse = gestionErreur(async (req, res) => {
    console.log(req.body)
    const { nom } = req.body
    if (!nom) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const course = await req.Courses.findOne({ where: { nom: nom }, raw: true })
    if (!course) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }
    await req.Courses.destroy({ where: { nom: nom } })
    await res.json({ etat: true, detail: await recupererToutesLesCourses(req) })

}, "controleurSupprimerCourse", "Erreur lors de la suppression de la course")

export const modifierCourse = gestionErreur(async (req, res) => {
    await enregistrerCourses(req, res, "modification")
}, "controleurModifierCourse", "Erreur lors de la modification de la course")

export const recupererCoursesAccueil = gestionErreur(async (req, res) => {
    const donnees = await req.Courses.findAll({
        where: { etat: "valider" },
        attributes: ["nom", "date", "lieu"],
        order: [["date", "ASC"]],
        limit: 6,
        raw: true,
    })
    return res.json({ etat: true, detail: donnees })
}, "controleurRecupererCoursesAccueil", "Erreur lors de la récupération des courses")

export const suggestion = gestionErreur(async (req, res) => {
    const donnees = await enregistrerCourses(req, res, "suggestion")
    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true })

    await envoiMail(process.env.EMAIL_ADMINISTRATEUR, "Proposition course – Running Vincennes Association", "suggestionCourse", {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        nomCourse: req.body.nom,
        url: process.env.IP_FRONTEND + "/administration/courses/"
    })

    return res.json({ etat: true, detail: { course: true, detail: "Suggestion envoyée avec succès !" } })

}, "controleurSuggestionCourse", "Erreur lors de l'envoi de la course")

export const toutesLesCoursesAdmin = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererToutesLesCourses(req, true) })
}, "controleurToutesLesCoursesAdmin", "Erreur lors de la récupération des courses")