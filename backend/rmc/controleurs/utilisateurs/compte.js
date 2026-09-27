import envoiMail from "../../../fonctions/mailer/mailer.service.js";
import { genererChaine } from "../../../fonctions/utilitaires/genererChaine.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const cheminDossierAdherents = path.resolve(__dirname, "../../../medias/adherents");

// Fonctions BDD
export async function fonctionRecupererUtilisateurs(req, res = null) {
    const utilisateurs = await req.Utilisateurs.findAll({
        where: { role: "adherent" },
        attributes: ["id", "prenom", "nom", "mail", "cheminTrombinoscope", "derniereConnexion", "dateNaissance"],
        order: [["derniereConnexion", "ASC"]],
        raw: true
    })
    if (!res) return utilisateurs
    return res.json({ etat: true, detail: utilisateurs })
}

export async function envoyerMailCreationCompte(req, mail, prenom, idUtilisateur) {
    const chaine = genererChaine(10);
    await req.Tokens.create({
        token: chaine,
        type: "lienConnexion",
        details: { idUtilisateur },
        dateExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    try {
        await envoiMail(mail, "Activation du compte – Running Vincennes Association", "creationCompte", {
            prenom: prenom,
            url: process.env.IP_FRONTEND + "/t/" + chaine
        });
    } catch (erreur) {
        // Sans ce nettoyage, relancerInitialisationCompte refuserait un nouvel envoi pendant 24 h
        await req.Tokens.destroy({ where: { token: chaine } });
        throw erreur;
    }
}