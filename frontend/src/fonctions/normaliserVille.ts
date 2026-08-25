const PREPOSITIONS_VILLES = new Set(["de", "des", "du", "en", "la", "le", "les", "sur", "sous", "aux", "a", "à"]);

// Fonction pour supprimer les accents (ex: "Mandé" -> "Mande")
export function supprimerAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normaliserVille(nomBrut: string): string {
    if (!nomBrut || !nomBrut.trim()) return "";

    // 1. Supprime les accents et remplace les espaces/tirets multiples par un seul tiret
    const nomSansAccents = supprimerAccents(nomBrut.trim())
        .replace(/[\s\-_]+/g, "-")
        .toLowerCase();

    // 2. Met les majuscules aux mots (sauf prépositions)
    return nomSansAccents
        .split("-")
        .map((mot, index) => {
            if (index > 0 && PREPOSITIONS_VILLES.has(mot)) {
                return mot;
            }
            return mot.charAt(0).toUpperCase() + mot.slice(1);
        })
        .join("-");
}