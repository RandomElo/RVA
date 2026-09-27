import { parse } from "csv-parse/sync";
import { REGEX_DATE_NAISSANCE, REGEX_NOM } from "./validation.js";

const REGEX_MAIL_CSV = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lit le contenu d'un CSV d'invitation ("Prénom;Nom;Date de naissance;Adresse mail").
// Lève une erreur si le fichier est mal formé (guillemet non fermé, par exemple).
export function lireLignesCsv(contenu) {
    // relax_column_count : une ligne au mauvais nombre de colonnes est signalée par validerLignesCsv au lieu de faire échouer tout l'import
    // info : conserve le numéro de ligne réel du fichier (les lignes vides sont ignorées)
    return parse(contenu, { delimiter: ";", trim: true, skip_empty_lines: true, relax_column_count: true, bom: true, info: true })
        .map(({ record, info }) => ({ colonnes: record, numero: info.lines }));
}

// Mails à rechercher en base : uniquement ceux des lignes au bon format
export function mailsDesLignesCsv(lignes) {
    return lignes.filter(({ colonnes }) => colonnes.length === 4 && colonnes[3]).map(({ colonnes }) => colonnes[3]);
}

// Valide les lignes lues par lireLignesCsv.
// mailsExistants : Set des mails déjà en base (comparaison exacte, comme en base).
// Retourne les comptes à créer et les messages d'erreur, dans l'ordre du fichier.
export function validerLignesCsv(lignes, mailsExistants) {
    const aCreer = [];
    const erreurs = [];

    for (const { colonnes: ligne, numero } of lignes) {
        if (ligne.length !== 4) {
            erreurs.push(`Ligne ${numero} : le format doit être "Prénom;Nom;Date de naissance;Adresse mail".`);
            continue;
        }

        let [prenom, nom, dateNaissance, email] = ligne;

        if (!prenom || !nom || !email || !dateNaissance) {
            erreurs.push(`Ligne ${numero} : une ou plusieurs colonnes sont vides.`);
            continue;
        }

        if (!REGEX_NOM.test(prenom) || !REGEX_NOM.test(nom)) {
            erreurs.push(`Ligne ${numero} : le prénom ou le nom "${prenom} ${nom}" contient des caractères non autorisés.`);
            continue;
        }

        if (!REGEX_MAIL_CSV.test(email)) {
            erreurs.push(`Ligne ${numero} : l'adresse email "${email}" est invalide.`);
            continue;
        }

        // Si l'année est présente (-AAAA, /AAAA ou .AAAA), on la supprime,
        // puis on ramène JJ-MM et JJ.MM au format JJ/MM attendu en base
        dateNaissance = dateNaissance.replace(/[-/.]\d{4}$/, '').replace(/[-.]/g, '/');

        // Validation finale : exactement JJ/MM (du 01/01 au 31/12)
        if (!REGEX_DATE_NAISSANCE.test(dateNaissance)) {
            erreurs.push(`Ligne ${numero} : la date de naissance "${dateNaissance}" est invalide.`);
            continue;
        }

        if (mailsExistants.has(email)) {
            erreurs.push(`Ligne ${numero} : utilisateur déjà existant (${email}).`);
            continue;
        }

        if (aCreer.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            erreurs.push(`Ligne ${numero} : adresse email en double dans le fichier (${email}).`);
            continue;
        }

        aCreer.push({ ligne: numero, prenom, nom, email, dateNaissance });
    }

    return { aCreer, erreurs };
}
