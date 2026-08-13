import gestionErreur from "../middlewares/gestionErreur.js";
import path from "path";
import fs from 'fs/promises';
import { fileURLToPath } from "url";
import { Op } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Regex pour autoriser uniquement les caractères alphanumériques, tirets et slashes (pour sous-dossiers)
const NOM_PAGE_VALIDE = /^[a-z0-9\/-]+$/i;

// Sinon, il prend le chemin local par défaut.
const CHEMIN_DOSSIER_TEXTES = path.resolve(
    process.env.DOSSIER_TEXTES || path.join(__dirname, "../../../frontend/public/textes")
);

/**
 * Calcule et vérifie le chemin d'un fichier JSON.
 * Résout la faille de sécurité Path Traversal et retourne le chemin complet et relatif.
 */
const cheminFichierPage2 = (nom) => {
    // 1. Validation basique par Regex
    const nomNettoye = nom.replace(/\\/g, "/");
    if (!NOM_PAGE_VALIDE.test(nomNettoye)) {
        const err = new Error("Nom de page invalide");
        err.code = "EINVAL";
        throw err;
    }

    // 2. Résolution du chemin absolu
    const cheminAbsolu = path.resolve(CHEMIN_DOSSIER_TEXTES, `${nomNettoye}.json`);

    // 3. Sécurité : Vérifie que le fichier cible reste strictement à l'intérieur du dossier autorisé
    const dossierAutoriseAvecSeparateur = CHEMIN_DOSSIER_TEXTES.endsWith(path.sep)
        ? CHEMIN_DOSSIER_TEXTES
        : CHEMIN_DOSSIER_TEXTES + path.sep;

    if (!cheminAbsolu.startsWith(dossierAutoriseAvecSeparateur) && cheminAbsolu !== CHEMIN_DOSSIER_TEXTES) {
        const err = new Error("Accès refusé : chemin en dehors du dossier autorisé");
        err.code = "EACCES";
        throw err;
    }

    const cheminRelatif = path.relative(CHEMIN_DOSSIER_TEXTES, cheminAbsolu).replace(/\\/g, "/");

    return { cheminComplet: cheminAbsolu, cheminRelatif };
};

const construireArborescence = (listePagesBdd = []) => {
    const racine = [];

    for (const page of listePagesBdd) {
        const segments = page.url.split('/').filter(Boolean);

        if (segments.length === 0) {
            racine.push({
                titre: page.titre,
                chemin: page.url,
                modifiable: page.modifiable,
                enfants: []
            });
            continue;
        }

        let niveauActuel = racine;
        let cheminAccumule = "";

        segments.forEach((segment, index) => {
            cheminAccumule += `/${segment}`;
            const estDernierSegment = index === segments.length - 1;

            let noeudExistant = niveauActuel.find(item => item.chemin === cheminAccumule);

            if (!noeudExistant) {
                noeudExistant = {
                    titre: estDernierSegment ? page.titre : segment.charAt(0).toUpperCase() + segment.slice(1),
                    modifiable: page.modifiable,
                    chemin: cheminAccumule,
                    enfants: []
                };
                niveauActuel.push(noeudExistant);
            } else if (estDernierSegment) {
                noeudExistant.titre = page.titre;
            }

            niveauActuel = noeudExistant.enfants;
        });
    }

    return racine;
};

/**
 * Fonction utilitaire pour vérifier l'unicité du titre / URL
 * et régénérer l'arborescence à jour.
 */
async function verifierChampsEtRecupererArborescence(Pages, { titre, url, ancienneUrl = null }) {
    const clauseExclusion = ancienneUrl ? { url: { [Op.ne]: ancienneUrl } } : {};

    const [verificationTitre, verificationUrl] = await Promise.all([
        Pages.findOne({ where: { titre, ...clauseExclusion }, raw: true }),
        Pages.findOne({ where: { url, ...clauseExclusion }, raw: true }),
    ]);

    if (verificationTitre) {
        return { valide: false, message: "Une page utilise déjà ce titre" };
    }

    if (verificationUrl && !ancienneUrl) {
        return { valide: false, message: "Une page utilise déjà cette url" };
    }

    const obtenirArborescence = async () => {
        const toutesPagesBdd = await Pages.findAll({
            attributes: ["titre", "url", "modifiable", "dansNavigation"],
            raw: true
        });
        return construireArborescence(toutesPagesBdd);
    };

    return { valide: true, obtenirArborescence };
}

export const recupererTextesPage = gestionErreur(async (req, res) => {
    let nom = req.params[0] || req.params.nom;
    if (!nom) {
        return res.status(400).json({ etat: false, detail: "Nom de page requis" });
    }
    nom = nom.replace(/_/g, "/");

    let cheminComplet;
    try {
        // CORRECTION DE SÉCURITÉ : Utilisation de cheminFichierPage2
        ({ cheminComplet } = cheminFichierPage2(nom));
    } catch (err) {
        if (err.code === "EACCES" || err.code === "EINVAL") {
            return res.status(400).json({ etat: false, detail: "Nom de page invalide" });
        }
        return res.status(400).json({ etat: false, detail: "Erreur d'accès au fichier" });
    }

    try {
        const contenu = await fs.readFile(cheminComplet, "utf-8");
        return res.json({ etat: true, detail: JSON.parse(contenu) });
    } catch (err) {
        if (err.code === "ENOENT") {
            return res.status(404).json({ etat: false, detail: "Page introuvable" });
        }
        throw err;
    }
}, "controleurTextePage", "Erreur lors de la récupération des textes de la page");

export const modifierTextesPage = gestionErreur(async (req, res) => {
    let nom = req.params[0] || req.params.nom;
    if (!nom) {
        return res.status(400).json({ etat: false, detail: "Nom de page requis" });
    }
    nom = nom.replace(/_/g, "/");
    const { textes } = req.body;

    if (!textes || typeof textes !== "object" || Array.isArray(textes)) {
        return res.status(400).json({ etat: false, detail: "Aucune modification fournie" });
    }

    let cheminComplet, cheminRelatif;
    try {
        ({ cheminComplet, cheminRelatif } = cheminFichierPage2(nom));
    } catch (err) {
        if (err.code === "EACCES" || err.code === "EINVAL") {
            return res.status(400).json({ etat: false, detail: "Nom de page invalide" });
        }
        return res.status(400).json({ etat: false, detail: "Erreur d'accès au fichier" });
    }

    let contenuActuel;
    try {
        contenuActuel = await fs.readFile(cheminComplet, "utf-8");
    } catch (err) {
        if (err.code === "ENOENT") {
            return res.status(404).json({ etat: false, detail: "Page introuvable" });
        }
        throw err;
    }

    const donneesActuelles = JSON.parse(contenuActuel);

    // On ne garde que les clés existantes dans le fichier (Whitelist)
    const modificationsValides = Object.fromEntries(
        Object.entries(textes).filter(([cle]) => cle in donneesActuelles)
    );

    const donneesFusionnees = { ...donneesActuelles, ...modificationsValides };

    await fs.writeFile(cheminComplet, JSON.stringify(donneesFusionnees, null, 2), "utf-8");

    return res.json({
        etat: true,
        detail: {
            donnees: donneesFusionnees,
            chemin: cheminRelatif.replace(".json", ""),
        },
    });
}, "controleurTextePage", "Erreur lors de l'enregistrement des modifications de la page");

export const recupererArboresence = gestionErreur(async (req, res) => {
    const [pagesBdd, toutesPagesBdd, entrees] = await Promise.all([
        req.Pages.findAll({ where: { modifiable: false }, raw: true }),
        req.Pages.findAll({ attributes: ["titre", "url", "modifiable", "dansNavigation"], raw: true }),
        fs.readdir(CHEMIN_DOSSIER_TEXTES, { recursive: true, withFileTypes: true })
    ]);

    const fichiersJson = entrees.filter(
        (entree) => entree.isFile() && entree.name.endsWith(".json")
    );

    const [pages, arborescence] = await Promise.all([
        Promise.all(
            fichiersJson.map(async (fichier) => {
                const cheminAbsolu = path.join(fichier.parentPath || fichier.path, fichier.name);
                const cheminRelatif = path.relative(CHEMIN_DOSSIER_TEXTES, cheminAbsolu).replace(/\\/g, "/");
                const nom = cheminRelatif.replace(/\.json$/, "");

                const urlCherchee = nom === "index" || nom === "accueil" ? "/" : "/" + nom;
                const elementBdd = pagesBdd.find((element) => element.url === urlCherchee);

                const contenu = await fs.readFile(cheminAbsolu, "utf-8");
                const donnees = JSON.parse(contenu);

                return {
                    nom: elementBdd ? elementBdd.titre : nom,
                    chemin: elementBdd ? elementBdd.url : urlCherchee,
                    nombreTextes: Object.values(donnees).filter(
                        (valeur) => valeur !== null && valeur !== undefined && String(valeur).trim() !== ""
                    ).length
                };
            })
        ),
        Promise.resolve(construireArborescence(toutesPagesBdd))
    ]);

    return res.json({
        etat: true,
        detail: {
            arborescence,
            listePages: pages
        }
    });
}, "controleurRecupererArboresencePages", "Erreur lors de la récupération de l'arborescence et des pages");

export const creation = gestionErreur(async (req, res) => {
    const { contenuHtml, dansNavigation, titre, url } = req.body;

    if (!contenuHtml || typeof dansNavigation !== "boolean" || !titre || !url) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    const verification = await verifierChampsEtRecupererArborescence(req.Pages, { titre, url });
    if (!verification.valide) {
        return res.json({ etat: true, detail: { page: false, detail: verification.message } });
    }

    await req.Pages.create({ titre, url, modifiable: true, dansNavigation, contenuHtml });

    const arborescenceMiseAJour = await verification.obtenirArborescence();

    return res.json({ etat: true, detail: { page: true, arborescence: arborescenceMiseAJour } });

}, "controleurCreationPage", "Erreur lors de la création de la page");

export const modification = gestionErreur(async (req, res) => {
    const { contenuHtml, dansNavigation, titre, url, ancienneUrl } = req.body;

    if (!contenuHtml || typeof dansNavigation !== "boolean" || !titre || !url || !ancienneUrl) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    const pageExistante = await req.Pages.findOne({ where: { url: ancienneUrl }, raw: true });
    if (!pageExistante) {
        return res.json({ etat: true, detail: { page: false, detail: "La page à modifier n'existe pas." } });
    }

    const verification = await verifierChampsEtRecupererArborescence(req.Pages, { titre, url, ancienneUrl });
    if (!verification.valide) {
        return res.json({ etat: true, detail: { page: false, detail: verification.message } });
    }

    await req.Pages.update(
        { titre, url, dansNavigation, contenuHtml },
        { where: { url: ancienneUrl } }
    );

    const arborescenceMiseAJour = await verification.obtenirArborescence();

    return res.json({ etat: true, detail: { page: true, arborescence: arborescenceMiseAJour } });

}, "controleurModificationPage", "Erreur lors de la modification de la page");

export const supprimer = gestionErreur(async (req, res) => {
    const { nom } = req.body;
    if (!nom) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const page = await req.Pages.findOne({ where: { titre: nom } });
    if (!page) {
        return res.status(404).json({
            etat: false,
            detail: "Ressource inexistante",
        });
    }

    await page.destroy();

    const toutesPagesBdd = await req.Pages.findAll({
        attributes: ["titre", "url", "modifiable", "dansNavigation"],
        raw: true
    });

    const arborescenceMiseAJour = construireArborescence(toutesPagesBdd);
    return res.json({ etat: true, detail: arborescenceMiseAJour });

}, "controleurSupprimerPage", "Erreur lors de la suppression de la page");

export const detailsPage = gestionErreur(async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ erreur: "Requête incorrecte." });
    }
    const donnees = await req.Pages.findOne({ where: { modifiable: true, url }, attributes: ["contenuHtml", "titre"], raw: true });
    if (donnees) {
        return res.json({ etat: true, detail: { page: true, detail: donnees } });
    } else {
        return res.json({ etat: true, detail: { page: false, detail: 404 } });
    }
}, "controleurDetailsPage", "Erreur lors de la récupération des détails de la page");

export const detailsPageAdmin = gestionErreur(async (req, res) => {
    const { url } = req.params;
    if (!url) {
        return res.status(400).json({ erreur: "Requête incorrecte." });
    }

    const donnees = await req.Pages.findOne({ where: { modifiable: true, url }, attributes: ["contenuHtml", "titre", "url", "dansNavigation"], raw: true });

    return res.json({ etat: true, detail: donnees });
}, "controleurDetailsPageAdmin", "Erreur lors de la récupération des détails de la page");

export const navbar = gestionErreur(async (req, res) => {
    const liens = await req.Pages.findAll({ where: { modifiable: true }, attributes: ["url", "titre"], raw: true });
    return res.json({ etat: true, detail: liens });
}, "controleurRecuperationLienNavbar", "Erreur lors de la récupération des pages");