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

    if (mode == "creation") {
        await req.Courses.create(donnees);
    } else if (mode == "suggestion") {
        const course = await req.Courses.create(donnees);
        if (req.body.etatInteressementUtilisateur) {
            await req.AdherentsCourse.create({ idAdherent: req.idUtilisateur, idCourse: course.id, statut: req.body.etatInteressementUtilisateur })
        }
    } else {
        await req.Courses.update(donnees, { where: { nom } })
    }

    if (mode !== "suggestion") {
        return res.json({ etat: true, detail: { course: true, detail: await recupererToutesLesCourses(req), notification: mode == "creation" ? "Course crée avec succès !" : "Course modifiée avec succès !" } })
    }
}

async function recupererToutesLesCourses(req, admin = false) {
    const estConnecte = Boolean(req.idUtilisateur);

    const includes = [];

    if (estConnecte) {
        // Jointure avec l'alias 'adherent' exigé par Sequelize
        includes.push({
            model: req.AdherentsCourse,
            as: "adherentsCourses",
            attributes: ["statut"],
            include: [{
                model: req.Utilisateurs,
                as: "adherent", // 👈 Modifié 'utilisateur' -> 'adherent'
                attributes: ["id", "nom", "prenom", "cheminTrombinoscope"]
            }]
        });
    }

    const courses = await req.Courses.findAll({
        where: !admin ? { etat: "valider" } : {},
        attributes: [
            "id",
            "nom",
            "date",
            "lieu",
            "distance",
            "type",
            ...(estConnecte ? ["lienWhatsapp"] : []),
            "lienSite",
            "lienInscription",
            "inscriptionsOuvertes",
            "dateOuvertureInscription",
            ...(admin ? ["etat"] : [])
        ],
        include: includes,
        order: [["date", "ASC"]]
    });

    return courses.map(course => {
        const courseJSON = course.toJSON();
        const listeAdherents = courseJSON.adherentsCourses || [];

        // Recherche du statut de l'utilisateur connecté
        let etatInteressementUtilisateur = null;
        if (estConnecte) {
            const monInscription = listeAdherents.find(
                a => a.adherent?.id === req.idUtilisateur // 👈 Modifié 'a.utilisateur' -> 'a.adherent'
            );
            etatInteressementUtilisateur = monInscription ? monInscription.statut : null;
        }

        // Mappe la liste des personnes avec leurs infos
        const listePersonnes = estConnecte
            ? listeAdherents.map(item => ({
                id: item.adherent.id,                   // 👈 Modifié 'item.utilisateur' -> 'item.adherent'
                nom: item.adherent.nom,
                prenom: item.adherent.prenom,
                cheminTrombinoscope: item.adherent.cheminTrombinoscope,
                statut: item.statut
            }))
            : [];

        delete courseJSON.adherentsCourses;

        return {
            ...courseJSON,
            etatInteressementUtilisateur,
            listePersonnes
        };
    });
}

export const cree = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await enregistrerCourses(req, res, "creation") })
}, "controleurCree", "Erreur lors de la création de la course");


export const toutesLesCourses = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererToutesLesCourses(req) })
}, "controleurToutesLesCourses", "Erreur lors de la récupération des courses")

export const supprimerCourse = gestionErreur(async (req, res) => {
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

export const modifierInteressement = gestionErreur(async (req, res) => {
    const { idCourse, nouvelEtat } = req.body
    console.log(req.body)
    if (!idCourse || !nouvelEtat || (nouvelEtat !== "null" && nouvelEtat !== "participe" && nouvelEtat !== "interesse")) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const course = await req.Courses.findByPk(idCourse, { raw: true })
    if (!course) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    if (course.etat == "suggestion") {
        return res.status(403).json({
            etat: false,
            detail: "Accès interdit",
        });
    }
    await req.AdherentsCourse.upsert({
        idAdherent: req.idUtilisateur,
        idCourse: idCourse,
        statut: nouvelEtat === "null" ? null : nouvelEtat
    });
    await res.json({ etat: true, detail: await recupererToutesLesCourses(req) })
}, "controleurModifierEnregistrement", "Erreur lors de la modification de l'intéressement")