import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GestionArticles from "./GestionArticles";

const requeteMock = vi.fn();

vi.mock("../../fonctions/requete", () => ({
    useRequete: () => requeteMock,
}));

vi.mock("../../contexts/NotificationsContext", () => ({
    useNotifications: () => ({ notifier: vi.fn() }),
}));

const ARTICLES = [
    { url: "sortie-longue", titre: "Sortie longue du dimanche", categorie: "actu_publique", type: "publie", datePublication: "2026-05-01" },
    { url: "album-cross", titre: "Photos du cross", categorie: "album_photo", type: "brouillon", datePublication: "2026-06-01" },
];

function monter() {
    render(
        <MemoryRouter>
            <GestionArticles />
        </MemoryRouter>,
    );
}

describe("GestionArticles", () => {
    beforeEach(() => {
        requeteMock.mockReset();
    });

    it("affiche la liste des articles, la plus récente en premier", async () => {
        requeteMock.mockResolvedValue(ARTICLES);
        monter();

        expect(screen.getByText("Chargement des articles…")).toBeInTheDocument();
        await screen.findByText("Sortie longue du dimanche");

        expect(requeteMock).toHaveBeenCalledWith({ url: "/articles/recuperer-tous-articles-admin" });
        expect(screen.getByRole("heading", { name: "Articles" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Nouvel article" })).toHaveAttribute("href", "/rediger-article");
        const titres = screen.getAllByRole("listitem").map((li) => li.querySelector("p")?.textContent);
        expect(titres).toEqual(["Photos du cross", "Sortie longue du dimanche"]);
        expect(screen.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", "/administration/modifier-article/sortie-longue");
        expect(document.title).toBe("Gestion blog - Running Vincennes Association");
    });

    it("filtre par recherche et par onglet", async () => {
        requeteMock.mockResolvedValue(ARTICLES);
        monter();
        await screen.findByText("Sortie longue du dimanche");

        fireEvent.change(screen.getByPlaceholderText("Rechercher un titre…"), { target: { value: "CROSS" } });
        expect(screen.queryByText("Sortie longue du dimanche")).not.toBeInTheDocument();
        expect(screen.getByText("Photos du cross")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Rechercher un titre…"), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Publiés" }));
        expect(screen.getByText("Sortie longue du dimanche")).toBeInTheDocument();
        expect(screen.queryByText("Photos du cross")).not.toBeInTheDocument();
    });

    it("affiche l'état vide quand rien ne correspond", async () => {
        requeteMock.mockResolvedValue(ARTICLES);
        monter();
        await screen.findByText("Sortie longue du dimanche");

        fireEvent.change(screen.getByPlaceholderText("Rechercher un titre…"), { target: { value: "marathon" } });
        expect(screen.getByText("Aucun article ne correspond à cette recherche.")).toBeInTheDocument();
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("ouvre la confirmation de suppression", async () => {
        requeteMock.mockResolvedValue(ARTICLES);
        monter();
        await screen.findByText("Sortie longue du dimanche");

        fireEvent.click(screen.getAllByRole("button", { name: "Supprimer" })[0]);
        expect(screen.getByText("Supprimer l'article")).toBeInTheDocument();
    });
});
