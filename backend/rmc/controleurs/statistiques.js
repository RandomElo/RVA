import envoiMail from "../../fonctions/mailer/mailer.service.js";
import { formaterDate } from "../../fonctions/utilitaires/formaterDate.js";
import gestionErreur from "../middlewares/gestionErreur.js";
import { Op, fn, col, literal } from "sequelize";

// Fonctions

/**
 * Détermine le type de personne ("adherent", "visiteur" ou null)
 * @param {string|null|undefined} role - Le rôle de l'utilisateur
 * @returns {string|null} - "adherent", "visiteur", ou null si administrateur
 */
function determinerTypePersonne(role) {
    if (role === "administrateur") {
        return null; // On exclut les administrateurs des statistiques
    }
    if (role === "adherent") {
        return "adherent";
    }
    return "visiteur"; // Rôle indéfini, null ou visiteur non connecté
}

/**
 * Enregistre un événement (vue de page ou clic sur lien) en incrémentant
 * la ligne du jour correspondante, ou en la créant si elle n'existe pas.
 */
async function enregistrerEvenement(req, cible, typePersonne) {
    const aujourdHui = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [ligne, creee] = await req.Statistiques.findOrCreate({
        where: { cible, typePersonne, date: aujourdHui },
        defaults: { compteur: 1 },
    });

    if (!creee) {
        await ligne.increment("compteur", { by: 1 });
    }
}

const MOIS_ORDRE = {
    janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
    juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10,
    novembre: 11, decembre: 12, décembre: 12,
};

function extraireDateNewsletter(cible) {
    // ex: "/article/newsletter-aout-2026" -> ["newsletter", "aout", "2026"]
    const segments = cible.split("/").pop().split("-");
    const annee = Number(segments[segments.length - 1]);
    const mois = MOIS_ORDRE[segments[segments.length - 2]?.toLowerCase()] || 0;
    return annee * 100 + mois; // ex: 2026*100 + 8 = 202608, trie naturellement
}

const MOIS_ABREGES = {
    "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr",
    "05": "Mai", "06": "Juin", "07": "Juil", "08": "Août",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

function regrouperParMois(lignes) {
    const parMois = new Map();
    for (const ligne of lignes) {
        if (!parMois.has(ligne.mois)) {
            parMois.set(ligne.mois, { mois: ligne.mois, vues: 0 });
        }
        const entree = parMois.get(ligne.mois);
        entree.vues = Number(ligne.total);
    }
    return [...parMois.values()];
}

function regrouperAdherentsVisiteursParMois(lignes) {
    const parMois = {};

    for (const ligne of lignes) {
        const cle = ligne.mois; // "YYYY-MM"
        if (!parMois[cle]) {
            parMois[cle] = { mois: cle, adherents: 0, visiteurs: 0 };
        }
        if (ligne.typePersonne === "adherent") {
            parMois[cle].adherents = Number(ligne.total);
        } else if (ligne.typePersonne === "visiteur") {
            parMois[cle].visiteurs = Number(ligne.total);
        }
    }

    return Object.keys(parMois)
        .sort()
        .map((cle) => ({
            mois: MOIS_ABREGES[cle.slice(5, 7)] || cle,
            adherents: parMois[cle].adherents,
            visiteurs: parMois[cle].visiteurs,
        }));
}

async function obtenirStatistiquesDashboard({ req, debut, fin } = {}) {
    const filtreDate = {};
    if (debut) filtreDate[Op.gte] = debut;
    if (fin) filtreDate[Op.lte] = fin;
    const where = debut || fin ? { date: filtreDate } : {};

    const [totalVues, repartition, topPages, topArticles, topNewsletter, evolutionMensuelle, adherentsVisiteursMensuel] =
        await Promise.all([
            req.Statistiques.sum("compteur", { where: { ...where } }),
            req.Statistiques.findAll({
                where,
                attributes: ["typePersonne", [fn("SUM", col("compteur")), "total"]],
                group: ["typePersonne"],
                raw: true,
            }),
            req.Statistiques.findAll({
                where: { ...where },
                attributes: ["cible", [fn("SUM", col("compteur")), "total"]],
                group: ["cible"],
                order: [[literal("total"), "DESC"]],
                limit: 5,
                raw: true,
            }),
            req.Statistiques.findAll({
                where: {
                    ...where,
                    cible: { [Op.like]: "/article/%" },
                },
                attributes: ["cible", [fn("SUM", col("compteur")), "total"]],
                group: ["cible"],
                order: [[literal("total"), "DESC"]],
                limit: 10,
                raw: true,
            }),
            req.Statistiques.findAll({
                where: {
                    ...where,
                    cible: { [Op.like]: "/article/newsletter%" },
                },
                attributes: ["cible", [fn("SUM", col("compteur")), "total"]],
                group: ["cible"],
                raw: true,
            }),
            req.Statistiques.findAll({
                where,
                attributes: [
                    [fn("to_char", col("date"), "YYYY-MM"), "mois"],
                    [fn("SUM", col("compteur")), "total"],
                ],
                group: ["mois"],
                order: [[literal("mois"), "ASC"]],
                raw: true,
            }),
            req.Statistiques.findAll({
                where,
                attributes: [
                    [fn("to_char", col("date"), "YYYY-MM"), "mois"],
                    "typePersonne",
                    [fn("SUM", col("compteur")), "total"],
                ],
                group: ["mois", "typePersonne"],
                order: [[literal("mois"), "ASC"]],
                raw: true,
            }),
        ]);

    return {
        chiffresCles: {
            totalVuesPage: totalVues || 0,
            repartitionVisiteurAdherent: repartition.reduce(
                (acc, ligne) => ({ ...acc, [ligne.typePersonne]: Number(ligne.total) }),
                { visiteur: 0, adherent: 0 },
            ),
        },
        topPages: topPages.map((l) => ({ page: l.cible, vues: Number(l.total) })),
        topArticles: topArticles.map((l) => ({ page: l.cible, vues: Number(l.total) })),
        topNewsletters: topNewsletter
            .map((l) => ({ page: l.cible, vues: Number(l.total) }))
            .sort((a, b) => extraireDateNewsletter(a.page) - extraireDateNewsletter(b.page)),
        evolutionMensuelle: regrouperParMois(evolutionMensuelle),
        adherentsVisiteursParMois: regrouperAdherentsVisiteursParMois(adherentsVisiteursMensuel),
    };
}

async function envoyerMailReporting(req, debut, fin) {
    const donnees = await obtenirStatistiquesDashboard({ req, debut, fin });
    const debutSplit = debut.split("-");
    const finSplit = fin.split("-");

    const dateDebut = debutSplit[2] + "/" + debutSplit[1];
    const dateFin = finSplit[2] + "/" + finSplit[1];

    await envoiMail(
        process.env.EMAIL_ADMINISTRATEUR,
        `Récapitulatif statistiques (du ${dateDebut} au ${dateFin}) – Running Vincennes Association`,
        "recapStatistiques",
        {
            periodeDebut: formaterDate(debut),
            periodeFin: formaterDate(fin),
            lienDashboard: process.env.IP_FRONTEND + "/administration/statistiques",
            chiffresCles: donnees.chiffresCles,
            evolutionMensuelle: donnees.evolutionMensuelle,
            adherentsVisiteursParMois: donnees.adherentsVisiteursParMois,
            topPages: donnees.topPages.slice(0, 5),
            topArticles: donnees.topArticles.slice(0, 5),
            topNewsletters: donnees.topNewsletters.slice(0, 5),
        }
    );
}

export const enregistrementVue = gestionErreur(async (req, res) => {
    const { page } = req.body;
    if (!page || typeof page !== "string") {
        return res.status(400).json({ etat: false, detail: "Le champ 'page' est requis." });
    }

    // Récupère l'utilisateur s'il existe (via middleware d'authentification)
    const utilisateur = req.idUtilisateur
        ? await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true })
        : null;

    // Détermination du rôle
    const typePersonne = determinerTypePersonne(utilisateur?.role);

    if (typePersonne === null) {
        // Administrateur : on ne comptabilise jamais sa navigation
        return res.status(204).end();
    }

    await enregistrerEvenement(req, page, typePersonne);
    res.status(204).end();

}, "controleurEnregistrementVueStatistiques", "Erreur lors de l'enregistrement du chargement de la page");

export const recuperationStatistiques = gestionErreur(async (req, res) => {
    const { debut, fin } = req.query;
    if (!debut || !fin) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte" });
    }
    const donnees = await obtenirStatistiquesDashboard({ req, debut, fin });
    res.json({ etat: true, detail: donnees });
}, "controleurRecuperationStatistiques", "Erreur lors de la récupération des statistiques");

export const envoiMailContreRendu = gestionErreur(async (req, res) => {
    let { debut, fin } = req.body;
    console.log(req.body)
    if (!debut || !fin) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte" });
    }

    await envoyerMailReporting(req, debut, fin)

    return res.json({ etat: true, detail: "Mail envoyé avec succès" });

}, "controleurEnvoiMailContreRendu", "Erreur lors de l'envoi du mail");

export const mailRapport = gestionErreur(
  async (req, res) => {
    // 1. Vérification du secret interne
    const internalSecret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.INTERNAL_SECRET;

    // On refuse l'accès si le secret est absent, vide ou incorrect
    if (!expectedSecret || internalSecret !== expectedSecret) {
      return res.status(403).json({ 
        success: false, 
        message: "Accès refusé : secret interne invalide ou absent" 
      });
    }

    // 2. Gestion sécurisée des dates
    const maintenant = new Date();
    const ilYAUnMois = new Date(maintenant);
    ilYAUnMois.setMonth(ilYAUnMois.getMonth() - 1);

    // Ajustement si le mois précédent a moins de jours (ex: 31 mars -> fin février)
    if (ilYAUnMois.getMonth() === maintenant.getMonth()) {
      ilYAUnMois.setDate(0);
    }

    const debut = ilYAUnMois.toISOString().split("T")[0];
    const fin = maintenant.toISOString().split("T")[0];

    // 3. Envoi du mail
    await envoyerMailReporting(req, debut, fin);

    // 4. Réponse de succès (200 OK)
    return res.status(200).json({ 
      success: true, 
      message: "Rapport mensuel généré et envoyé avec succès",
      periode: { debut, fin }
    });
  },
  "controleurMailRapportStatistiques",
  "Erreur lors de la génération du mail rapport"
);