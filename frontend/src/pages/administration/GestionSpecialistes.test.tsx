import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Specialiste } from "../../constantes/types/specialistesSante";
import GestionSpecialistes from "./GestionSpecialistes";

const requeteMock = vi.fn();

vi.mock("../../fonctions/requete", () => ({
    useRequete: () => requeteMock,
}));

vi.mock("../../contexts/NotificationsContext", () => ({
    useNotifications: () => ({ notifier: vi.fn() }),
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ estAuth: true, role: "administrateur", chargement: false }),
}));

const SPECIALISTES: Specialiste[] = [
    { nom: "Cabinet Kiné Vincennes", specialite: "kine_sport", detail: "", adresse: "Vincennes", etat: "valider" },
    { nom: "Podologue du Bois", specialite: "podologue", detail: "", adresse: "Paris", etat: "suggestion" },
];

function monter() {
    render(
        <MemoryRouter>
            <GestionSpecialistes />
        </MemoryRouter>,
    );
}

describe("GestionSpecialistes", () => {
    beforeEach(() => {
        requeteMock.mockReset();
    });

    it("affiche la liste des spécialistes", async () => {
        requeteMock.mockResolvedValue(SPECIALISTES);
        monter();

        expect(screen.getByText("Chargement des spécialistes…")).toBeInTheDocument();
        await screen.findByText("Cabinet Kiné Vincennes");

        expect(requeteMock).toHaveBeenCalledWith({ url: "/specialistes/toutes-les-specialistes-admin" });
        expect(screen.getByText("Podologue du Bois")).toBeInTheDocument();
        expect(screen.getByText("Enregistré")).toBeInTheDocument();
    });

    it("filtre par recherche et par onglet", async () => {
        requeteMock.mockResolvedValue(SPECIALISTES);
        monter();
        await screen.findByText("Cabinet Kiné Vincennes");

        fireEvent.change(screen.getByPlaceholderText("Rechercher un nom…"), { target: { value: "podo" } });
        expect(screen.getByText("Podologue du Bois")).toBeInTheDocument();
        expect(screen.queryByText("Cabinet Kiné Vincennes")).not.toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Rechercher un nom…"), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Kiné du sport" }));
        expect(screen.getByText("Cabinet Kiné Vincennes")).toBeInTheDocument();
        expect(screen.queryByText("Podologue du Bois")).not.toBeInTheDocument();
    });

    it("affiche l'état vide quand rien ne correspond", async () => {
        requeteMock.mockResolvedValue(SPECIALISTES);
        monter();
        await screen.findByText("Cabinet Kiné Vincennes");

        fireEvent.click(screen.getByRole("button", { name: "Ostéopathe" }));
        expect(screen.getByText("Aucun spécialiste ne correspond à cette recherche.")).toBeInTheDocument();
    });
});
