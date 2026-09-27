import { describe, expect, it } from "vitest";

import { normaliserVille, supprimerAccents } from "./normaliserVille";

describe("supprimerAccents", () => {
    it("retire les accents et cédilles", () => {
        expect(supprimerAccents("Saint-Mandé")).toBe("Saint-Mande");
        expect(supprimerAccents("Châlons Français")).toBe("Chalons Francais");
    });

    it("laisse une chaîne sans accent inchangée", () => {
        expect(supprimerAccents("Vincennes")).toBe("Vincennes");
    });
});

describe("normaliserVille", () => {
    it("renvoie une chaîne vide pour une entrée vide ou blanche", () => {
        expect(normaliserVille("")).toBe("");
        expect(normaliserVille("   ")).toBe("");
    });

    it("met une majuscule à chaque mot et retire les accents", () => {
        expect(normaliserVille("saint-mandé")).toBe("Saint-Mande");
        expect(normaliserVille("VINCENNES")).toBe("Vincennes");
    });

    it("remplace espaces, tirets et underscores multiples par un seul tiret", () => {
        expect(normaliserVille("  fontenay   sous  bois ")).toBe("Fontenay-sous-Bois");
        expect(normaliserVille("saint__maur--des_fosses")).toBe("Saint-Maur-des-Fosses");
    });

    it("laisse les prépositions en minuscules sauf en premier mot", () => {
        expect(normaliserVille("Châlons en Champagne")).toBe("Chalons-en-Champagne");
        expect(normaliserVille("le perreux sur marne")).toBe("Le-Perreux-sur-Marne");
        expect(normaliserVille("LA ROCHELLE")).toBe("La-Rochelle");
    });

    it("donne le même résultat pour différentes saisies de la même ville", () => {
        const attendu = normaliserVille("Saint-Maur-des-Fossés");

        expect(normaliserVille("saint maur des fosses")).toBe(attendu);
        expect(normaliserVille("SAINT-MAUR-DES-FOSSÉS")).toBe(attendu);
    });

    it("garde l'article élidé en minuscule sauf en premier mot et capitalise la lettre qui suit l'apostrophe", () => {
        expect(normaliserVille("Villeneuve-d'Ascq")).toBe("Villeneuve-d'Ascq");
        expect(normaliserVille("VILLENEUVE D'ASCQ")).toBe("Villeneuve-d'Ascq");
        expect(normaliserVille("L'Haÿ-les-Roses")).toBe("L'Hay-les-Roses");
        expect(normaliserVille("l'hay les roses")).toBe("L'Hay-les-Roses");
    });

    it("traite l'apostrophe typographique comme l'apostrophe droite", () => {
        expect(normaliserVille("Villeneuve-d\u2019Ascq")).toBe(normaliserVille("Villeneuve-d'Ascq"));
    });
});
