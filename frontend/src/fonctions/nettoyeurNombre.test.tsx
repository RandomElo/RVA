import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { bloqueurToucheInvalide, bloqueurToucheInvalideEntier, nettoyerEntier, nettoyerNombre } from "./nettoyeurNombre";

/* fireEvent renvoie false quand le gestionnaire a appelé preventDefault(). */
function toucheAcceptee(valeur: string, touche: string, options: { ctrlKey?: boolean; metaKey?: boolean } = {}, entier = false) {
    const { container } = render(<input aria-label="champ" defaultValue={valeur} onKeyDown={entier ? bloqueurToucheInvalideEntier : bloqueurToucheInvalide} />);
    return fireEvent.keyDown(within(container).getByLabelText("champ"), { key: touche, ...options });
}

describe("nettoyerNombre", () => {
    it("renvoie une chaîne vide pour une entrée vide", () => {
        expect(nettoyerNombre("")).toBe("");
    });

    it("remplace la virgule par un point", () => {
        expect(nettoyerNombre("15,5")).toBe("15.5");
    });

    it("supprime les caractères non numériques", () => {
        expect(nettoyerNombre("abc12 km")).toBe("12");
        expect(nettoyerNombre("-3")).toBe("3");
    });

    it("ne garde qu'un seul séparateur décimal", () => {
        expect(nettoyerNombre("1.2.3")).toBe("1.23");
        expect(nettoyerNombre("1,2.3")).toBe("1.23");
    });

    it("laisse un nombre valide inchangé", () => {
        expect(nettoyerNombre("19.2")).toBe("19.2");
        expect(nettoyerNombre("42")).toBe("42");
    });
});

describe("nettoyerEntier", () => {
    it("renvoie une chaîne vide pour une entrée vide", () => {
        expect(nettoyerEntier("")).toBe("");
    });

    it("ne garde que les chiffres", () => {
        expect(nettoyerEntier("12 semaines")).toBe("12");
        expect(nettoyerEntier("-8")).toBe("8");
    });
});

describe("bloqueurToucheInvalide", () => {
    it("accepte les chiffres et un premier séparateur", () => {
        expect(toucheAcceptee("", "7")).toBe(true);
        expect(toucheAcceptee("15", ",")).toBe(true);
        expect(toucheAcceptee("15", ".")).toBe(true);
    });

    it("refuse les lettres et un second séparateur", () => {
        expect(toucheAcceptee("", "e")).toBe(false);
        expect(toucheAcceptee("", "-")).toBe(false);
        expect(toucheAcceptee("15.5", ",")).toBe(false);
        expect(toucheAcceptee("15,5", ".")).toBe(false);
    });

    it("laisse passer les touches d'édition et les raccourcis", () => {
        expect(toucheAcceptee("15", "Backspace")).toBe(true);
        expect(toucheAcceptee("15", "ArrowLeft")).toBe(true);
        expect(toucheAcceptee("15", "v", { ctrlKey: true })).toBe(true);
        expect(toucheAcceptee("15", "c", { metaKey: true })).toBe(true);
    });
});

describe("bloqueurToucheInvalideEntier", () => {
    it("accepte uniquement les chiffres", () => {
        expect(toucheAcceptee("", "3", {}, true)).toBe(true);
        expect(toucheAcceptee("", ",", {}, true)).toBe(false);
        expect(toucheAcceptee("", ".", {}, true)).toBe(false);
        expect(toucheAcceptee("", "e", {}, true)).toBe(false);
    });

    it("laisse passer les touches d'édition et les raccourcis", () => {
        expect(toucheAcceptee("12", "Delete", {}, true)).toBe(true);
        expect(toucheAcceptee("12", "a", { ctrlKey: true }, true)).toBe(true);
    });
});
