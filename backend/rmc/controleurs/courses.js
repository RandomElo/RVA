import envoiMail from "../../fonctions/mailer/mailer.service.js";
import gestionErreur from "../middlewares/gestionErreur.js";
import { estUrl } from "../../fonctions/utilitaires/validation.js";
import { dateDuJour } from "../../fonctions/utilitaires/formaterDate.js";

// Fonctions utilitaires

const estDate = (date) => {
    if (typeof date !== "string") return false;

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;

    const d = new Date(date);

    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(date);
};

// Validation

const TYPES_AUTORISES = [
    "5km",
    "10km",
    "Semi",
    "Marathon",
    "Route",
    "Trail",
];

// Refus métier : la requête aboutit (200) mais la course n'est pas enregistrée
const refusCourse = (detail) => ({ ok: false, statut: 200, corps: { etat: true, detail: { course: false, detail } } });

// Validation sans réponse HTTP : { ok: true, donnees } ou { ok: false, statut, corps } à renvoyer tel quel
function validerCourse(corpsRequete) {
    const { nom, date, lieu, distance, type, lienWhatsapp, lienSite, lienInscription, inscriptionsOuvertes, dateOuvertureInscription } = corpsRequete;

    if (!nom || !date || !lieu || !type || typeof inscriptionsOuvertes !== "boolean") {
        return { ok: false, statut: 400, corps: { etat: false, detail: "Requête incorrecte" } };
    }

    // Date ; chaînes "AAAA-MM-JJ" : une course le jour même reste acceptée
    if (!estDate(date) || date < dateDuJour()) {
        return refusCourse("Date invalide.");
    }
    // Date d'ouverture (facultative)
    if (dateOuvertureInscription && (!estDate(dateOuvertureInscription) || dateOuvertureInscription < dateDuJour())) {
        return refusCourse("Date d'ouverture des inscriptions invalide.");
    }

    // Type
    if (!TYPES_AUTORISES.includes(type)) {
        return refusCourse("Type de course invalide.");
    }

    // URLs
    for (const url of [lienWhatsapp, lienSite, lienInscription]) {
        if (url != null && url !== "" && !estUrl(url)) {
            return refusCourse("Un des liens est invalide.");
        }
    }

    // Distance
    if ((type === "Route" || type === "Trail") && !Number.isFinite(Number(distance))) {
        return refusCourse("La distance doit être un nombre.");
    }

    return {
        ok: true,
        donnees: {
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
        },
    };
}

// Fonctions BDD

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
    const validation = validerCourse(req.body);
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    await req.Courses.create({ etat: "valider", ...validation.donnees });
    return res.json({ etat: true, detail: { course: true, detail: await recupererToutesLesCourses(req), notification: "Course crée avec succès !" } });
}, "controleurCree", "Erreur lors de la création de la course");


export const toutesLesCourses = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererToutesLesCourses(req) })
}, "controleurToutesLesCourses", "Erreur lors de la récupération des courses")

export const supprimerCourse = gestionErreur(async (req, res) => {
    const { nom } = req.body

    const course = await req.Courses.findOne({ where: { nom: nom }, raw: true })
    if (!course) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }
    await req.Courses.destroy({ where: { nom: nom } })
    await res.json({ etat: true, detail: await recupererToutesLesCourses(req) })

}, "controleurSupprimerCourse", "Erreur lors de la suppression de la course")

export const modifierCourse = gestionErreur(async (req, res) => {
    const validation = validerCourse(req.body);
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    const [nbModifiees] = await req.Courses.update({ etat: "valider", ...validation.donnees }, { where: { nom: validation.donnees.nom } })
    if (nbModifiees === 0) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }
    return res.json({ etat: true, detail: { course: true, detail: await recupererToutesLesCourses(req), notification: "Course modifiée avec succès !" } });
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
    const validation = validerCourse(req.body);
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    // Compte supprimé depuis la vérification du cookie : refus avant toute écriture
    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true })
    if (!utilisateur) {
        return res.status(403).json({ etat: false, detail: "Vous n'êtes pas connecté" });
    }

    const course = await req.Courses.create({ etat: "suggestion", ...validation.donnees });
    if (req.body.etatInteressementUtilisateur) {
        await req.AdherentsCourse.create({ idAdherent: req.idUtilisateur, idCourse: course.id, statut: req.body.etatInteressementUtilisateur })
    }

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
    if (!idCourse || !nouvelEtat || (nouvelEtat !== "null" && nouvelEtat !== "participe" && nouvelEtat !== "interesse")) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const course = await req.Courses.findByPk(idCourse, { raw: true })
    if (!course) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
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