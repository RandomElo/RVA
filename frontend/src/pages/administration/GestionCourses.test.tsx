import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GestionCourses from "./GestionCourses";

const requeteMock = vi.fn();

vi.mock("../../fonctions/requete", () => ({
    useRequete: () => requeteMock,
}));

vi.mock("../../contexts/NotificationsContext", () => ({
    useNotifications: () => ({ notifier: vi.fn() }),
}));

const COURSES = [
    { id: 1, nom: "Foulées de Vincennes", date: "2999-04-12", lieu: "Vincennes", type: "10km", inscriptionsOuvertes: true, lienWhatsapp: "https://chat.whatsapp.com/exemple", etatInteressementUtilisateur: null, listePersonnes: [] },
    { id: 2, nom: "Trail des bois", date: "2000-01-09", lieu: "Fontainebleau", type: "Trail", inscriptionsOuvertes: false, etat: "suggestion", etatInteressementUtilisateur: null, listePersonnes: [] },
];

function monter() {
    render(
        <MemoryRouter>
            <GestionCourses />
        </MemoryRouter>,
    );
}

describe("GestionCourses", () => {
    beforeEach(() => {
        requeteMock.mockReset();
    });

    it("affiche la liste des courses triée par date", async () => {
        requeteMock.mockResolvedValue(COURSES);
        monter();

        expect(screen.getByText("Chargement des courses…")).toBeInTheDocument();
        await screen.findByText("Foulées de Vincennes");

        expect(requeteMock).toHaveBeenCalledWith({ url: "/courses/toutes-les-courses-admin" });
        const noms = screen.getAllByRole("listitem").map((li) => li.querySelector("p")?.textContent);
        expect(noms).toEqual(["Trail des bois", "Foulées de Vincennes"]);
        expect(screen.getByRole("link", { name: "Groupe WhatsApp" })).toHaveAttribute("href", "https://chat.whatsapp.com/exemple");
        expect(screen.getByText("Passée")).toBeInTheDocument();
    });

    it("filtre par recherche (nom ou ville) et par onglet", async () => {
        requeteMock.mockResolvedValue(COURSES);
        monter();
        await screen.findByText("Foulées de Vincennes");

        fireEvent.change(screen.getByPlaceholderText("Rechercher une course, une ville…"), { target: { value: "fontaine" } });
        expect(screen.getByText("Trail des bois")).toBeInTheDocument();
        expect(screen.queryByText("Foulées de Vincennes")).not.toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Rechercher une course, une ville…"), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "À venir" }));
        expect(screen.getByText("Foulées de Vincennes")).toBeInTheDocument();
        expect(screen.queryByText("Trail des bois")).not.toBeInTheDocument();
    });

    it("affiche l'état vide quand rien ne correspond", async () => {
        requeteMock.mockResolvedValue(COURSES);
        monter();
        await screen.findByText("Foulées de Vincennes");

        fireEvent.change(screen.getByPlaceholderText("Rechercher une course, une ville…"), { target: { value: "marathon de paris" } });
        expect(screen.getByText("Aucune course ne correspond à cette recherche.")).toBeInTheDocument();
    });
});
