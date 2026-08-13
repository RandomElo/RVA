export const nettoyerNombre = (value: string): string => {
    if (value === "") return "";
    // 1. Remplace toutes les virgules par des points
    let formatted = value.replace(/,/g, ".");
    // 2. Supprime tout ce qui n'est pas un chiffre ou un point
    formatted = formatted.replace(/[^0-9.]/g, "");
    // 3. S'assure qu'il n'y a qu'un seul point
    const parts = formatted.split(".");
    if (parts.length > 2) {
        formatted = parts[0] + "." + parts.slice(1).join("");
    }
    return formatted;
};

export const nettoyerEntier = (value: string): string => {
    if (value === "") return "";
    // Supprime tout ce qui n'est pas un chiffre
    return value.replace(/[^0-9]/g, "");
};

export const bloqueurToucheInvalideEntier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const touchesAutorisees = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Home", "End",
    ];
    if (touchesAutorisees.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;

    const estChiffre = /^[0-9]$/.test(e.key);
    if (!estChiffre) {
        e.preventDefault();
    }
};

export const bloqueurToucheInvalide = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Touches toujours autorisées (navigation, édition, copier/coller...)
    const touchesAutorisees = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Home", "End",
    ];
    if (touchesAutorisees.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return; // Ctrl+C, Ctrl+V, Ctrl+A...

    // Chiffres, point, virgule uniquement
    const estChiffre = /^[0-9]$/.test(e.key);
    const estSeparateur = e.key === "." || e.key === ",";

    if (!estChiffre && !estSeparateur) {
        e.preventDefault();
        return;
    }

    // Empêche un 2e séparateur décimal
    const valeurActuelle = e.currentTarget.value;
    if (estSeparateur && (valeurActuelle.includes(".") || valeurActuelle.includes(","))) {
        e.preventDefault();
    }
};