const PREPOSITIONS_VILLES = new Set(["de", "des", "du", "en", "la", "le", "les", "sur", "sous", "aux", "a", "à"]);
// Articles élidés devant une apostrophe (ex: "Villeneuve-d'Ascq", "L'Haÿ-les-Roses")
const ELISIONS_VILLES = new Set(["d", "l"]);

function capitaliser(mot: string): string {
    return mot.charAt(0).toUpperCase() + mot.slice(1);
}

// Fonction pour supprimer les accents (ex: "Mandé" -> "Mande")
export function supprimerAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normaliserVille(nomBrut: string): string {
    if (!nomBrut || !nomBrut.trim()) return "";

    // 1. Supprime les accents et remplace les espaces/tirets multiples par un seul tiret
    const nomSansAccents = supprimerAccents(nomBrut.trim())
        .replace(/[\s\-_]+/g, "-")
        .replace(/[\u2018\u2019]/g, "'")
        .toLowerCase();

    // 2. Met les majuscules aux mots (sauf prépositions et articles élidés hors premier mot)
    return nomSansAccents
        .split("-")
        .map((mot, index) => {
            if (index > 0 && PREPOSITIONS_VILLES.has(mot)) {
                return mot;
            }
            return mot
                .split("'")
                .map((partie, indexPartie, parties) => {
                    const estElision = indexPartie < parties.length - 1 && ELISIONS_VILLES.has(partie);
                    const estPremierMot = index === 0 && indexPartie === 0;
                    return estElision && !estPremierMot ? partie : capitaliser(partie);
                })
                .join("'");
        })
        .join("-");
}