import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useListeAdmin } from "./useListeAdmin";

const requeteMock = vi.fn();

vi.mock("./requete", () => ({
    useRequete: () => requeteMock,
}));

type Element = { nom: string; groupe: string; rang: number };

const ELEMENTS: Element[] = [
    { nom: "Alpha", groupe: "a", rang: 2 },
    { nom: "Bravo", groupe: "b", rang: 1 },
    { nom: "Charlie", groupe: "a", rang: 3 },
];

function filtrer(e: Element, onglet: string, recherche: string) {
    return (onglet === "tous" || e.groupe === onglet) && e.nom.toLowerCase().includes(recherche);
}

function comparer(a: Element, b: Element) {
    return a.rang - b.rang;
}

describe("useListeAdmin", () => {
    beforeEach(() => {
        requeteMock.mockReset();
    });

    it("est en chargement puis expose la liste triée", async () => {
        requeteMock.mockResolvedValue(ELEMENTS);
        const { result } = renderHook(() => useListeAdmin<Element>({ url: "/liste", filtrer, comparer }));

        expect(result.current.enChargement).toBe(true);
        expect(result.current.elementsFiltres).toEqual([]);

        await waitFor(() => expect(result.current.enChargement).toBe(false));
        expect(requeteMock).toHaveBeenCalledWith({ url: "/liste" });
        expect(result.current.elementsFiltres.map((e) => e.nom)).toEqual(["Bravo", "Alpha", "Charlie"]);
    });

    it("filtre par onglet et par recherche (normalisée)", async () => {
        requeteMock.mockResolvedValue(ELEMENTS);
        const { result } = renderHook(() => useListeAdmin<Element>({ url: "/liste", filtrer, comparer }));
        await waitFor(() => expect(result.current.enChargement).toBe(false));

        act(() => result.current.setOnglet("a"));
        expect(result.current.elementsFiltres.map((e) => e.nom)).toEqual(["Alpha", "Charlie"]);

        act(() => result.current.setRecherche("  CHAR "));
        expect(result.current.elementsFiltres.map((e) => e.nom)).toEqual(["Charlie"]);

        act(() => result.current.setOnglet("b"));
        expect(result.current.elementsFiltres).toEqual([]);
    });

    it("ne trie pas sans comparateur et ne modifie pas les données sources", async () => {
        requeteMock.mockResolvedValue([...ELEMENTS]);
        const { result } = renderHook(() => useListeAdmin<Element>({ url: "/liste", filtrer }));
        await waitFor(() => expect(result.current.enChargement).toBe(false));

        expect(result.current.elementsFiltres.map((e) => e.nom)).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("reste en chargement si la requête échoue", async () => {
        requeteMock.mockResolvedValue(null);
        const { result } = renderHook(() => useListeAdmin<Element>({ url: "/liste", filtrer }));

        await waitFor(() => expect(requeteMock).toHaveBeenCalled());
        expect(result.current.donnees).toBeNull();
        expect(result.current.enChargement).toBe(true);
    });

    it("garde la liste déjà chargée quand un rechargement échoue", async () => {
        requeteMock.mockResolvedValueOnce(ELEMENTS).mockResolvedValueOnce(null);
        const { result, rerender } = renderHook(({ url }) => useListeAdmin<Element>({ url, filtrer }), { initialProps: { url: "/liste" } });
        await waitFor(() => expect(result.current.enChargement).toBe(false));

        rerender({ url: "/autre-liste" });
        await waitFor(() => expect(requeteMock).toHaveBeenCalledTimes(2));

        expect(result.current.donnees).toEqual(ELEMENTS);
    });

    it("expose un setter qui remplace la liste (ex. après suppression)", async () => {
        requeteMock.mockResolvedValue(ELEMENTS);
        const { result } = renderHook(() => useListeAdmin<Element>({ url: "/liste", filtrer }));
        await waitFor(() => expect(result.current.enChargement).toBe(false));

        act(() => result.current.setDonnees([ELEMENTS[1]]));
        expect(result.current.elementsFiltres.map((e) => e.nom)).toEqual(["Bravo"]);
    });
});
