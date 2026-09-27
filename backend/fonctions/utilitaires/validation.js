export const estUrl = (url) => {
    try {
        const { protocol } = new URL(url);
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
};

// Nom de fichier simple (pas de séparateur ni de "..") : protège contre le path traversal
export const estNomFichierSur = (nomFichier) =>
    typeof nomFichier === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(nomFichier) &&
    !nomFichier.includes("..");

// Prénom / nom : lettres (accents compris), séparées par un espace, une apostrophe ou un tiret
export const REGEX_NOM = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

// Date de naissance sans année : JJ/MM
export const REGEX_DATE_NAISSANCE = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
