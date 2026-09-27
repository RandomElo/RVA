import envoiMail from "../../fonctions/mailer/mailer.service.js";
import gestionErreur from "../middlewares/gestionErreur.js";
import { estUrl } from "../../fonctions/utilitaires/validation.js";

const SPECIALITES_AUTORISEES = [
    "kine_sport",
    "kine",
    "podologue",
    "osteopathe",
    "medecin_sport",
];

const REGEX_TELEPHONE = /^(0|\+33\s?)[1-9](\s?\d{2}){4}$/;

// Refus métier : la requête aboutit (200) mais le spécialiste n'est pas enregistré
const refusSpecialiste = (detail) => ({ ok: false, statut: 200, corps: { etat: true, detail: { specialiste: false, detail } } });

// Validation sans réponse HTTP : { ok: true, donnees } ou { ok: false, statut, corps } à renvoyer tel quel
function validerSpecialiste(corpsRequete) {
    // Présence de nom, specialite, detail et adresse vérifiée par validerCorps dans le routeur
    const { nom, specialite, detail, adresse, telephone, lienReservation } = corpsRequete;

    // Spécialité
    if (!SPECIALITES_AUTORISEES.includes(specialite)) {
        return refusSpecialiste("Spécialité invalide.");
    }

    // Téléphone (facultatif)
    if (telephone != null && telephone !== "" && !REGEX_TELEPHONE.test(telephone.replace(/[.\-]/g, " ").trim())) {
        return refusSpecialiste("Numéro de téléphone invalide.");
    }

    // Lien de réservation (facultatif)
    if (lienReservation != null && lienReservation !== "" && !estUrl(lienReservation)) {
        return refusSpecialiste("Le lien de réservation est invalide.");
    }

    return {
        ok: true,
        donnees: {
            nom,
            specialite,
            detail,
            adresse,
            telephone: telephone || null,
            lienReservation: lienReservation || null,
        },
    };
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
    const validation = validerSpecialiste(req.body);
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    await req.Specialistes.create({ etat: "valider", ...validation.donnees });
    return res.json({
        etat: true,
        detail: {
            specialiste: true,
            detail: await recupererTousLesSpecialistes(req),
            notification: "Spécialiste créé avec succès !",
        },
    });
}, "controleurCree", "Erreur lors de la création du spécialiste");

export const modifierSpecialiste = gestionErreur(async (req, res) => {
    const validation = validerSpecialiste(req.body);
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    const [nbModifies] = await req.Specialistes.update({ etat: "valider", ...validation.donnees }, { where: { nom: validation.donnees.nom } });
    if (nbModifies === 0) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }
    return res.json({
        etat: true,
        detail: {
            specialiste: true,
            detail: await recupererTousLesSpecialistesAdmin(req),
            notification: "Spécialiste modifié avec succès !",
        },
    });
}, "controleurModifierSpecialiste", "Erreur lors de la modification du spécialiste");

export const suggestion = gestionErreur(async (req, res) => {
    const validation = validerSpecialiste(req.body);
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    // Compte supprimé depuis la vérification du cookie : refus avant toute écriture
    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true });
    if (!utilisateur) {
        return res.status(403).json({ etat: false, detail: "Vous n'êtes pas connecté" });
    }

    await req.Specialistes.create({ etat: "suggestion", ...validation.donnees });

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

    const specialiste = await req.Specialistes.findOne({ where: { nom: nom }, raw: true })
    if (!specialiste) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }
    await req.Specialistes.destroy({ where: { nom: nom } })
    await res.json({ etat: true, detail: await recupererTousLesSpecialistesAdmin(req) })
}, "controleurSupprimerSpecialiste", "Erreur lors de la suppression du spécialisate de santé.")