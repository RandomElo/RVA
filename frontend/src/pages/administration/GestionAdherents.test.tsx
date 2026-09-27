import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Adherent } from "../../constantes/types/adherents";
import GestionAdherents from "./GestionAdherents";

const requeteMock = vi.fn();

vi.mock("../../fonctions/requete", () => ({
    useRequete: () => requeteMock,
}));

vi.mock("../../contexts/NotificationsContext", () => ({
    useNotifications: () => ({ notifier: vi.fn() }),
}));

const ADHERENTS: Adherent[] = [
    { id: "1", prenom: "Camille", nom: "Dupont", mail: "camille.dupont@exemple.com", cheminTrombinoscope: "", derniereConnexion: "2026-09-01", dateNaissance: "15/03" },
    { id: "2", prenom: "Louis", nom: "Martin", mail: "louis.martin@exemple.com", cheminTrombinoscope: "", derniereConnexion: "", dateNaissance: "02/11" },
];

function monter() {
    render(
        <MemoryRouter>
            <GestionAdherents />
        </MemoryRouter>,
    );
}

describe("GestionAdherents", () => {
    beforeEach(() => {
        requeteMock.mockReset();
    });

    it("affiche la liste des adhérents", async () => {
        requeteMock.mockResolvedValue(ADHERENTS);
        monter();

        expect(screen.getByText("Chargement des adhérents…")).toBeInTheDocument();
        await screen.findByText("Camille Dupont");

        expect(requeteMock).toHaveBeenCalledWith({ url: "/utilisateurs/recuperer-utilisateurs" });
        expect(screen.getByText("Louis Martin")).toBeInTheDocument();
        expect(screen.getByText("Actif")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Renvoyer l'invitation" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Envoyer un mail aux adhérents" })).toBeInTheDocument();
    });

    it("filtre par recherche (nom ou e-mail) et par onglet", async () => {
        requeteMock.mockResolvedValue(ADHERENTS);
        monter();
        await screen.findByText("Camille Dupont");

        fireEvent.change(screen.getByPlaceholderText("Rechercher un nom, un e-mail…"), { target: { value: "louis.martin" } });
        expect(screen.getByText("Louis Martin")).toBeInTheDocument();
        expect(screen.queryByText("Camille Dupont")).not.toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Rechercher un nom, un e-mail…"), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Actifs" }));
        expect(screen.getByText("Camille Dupont")).toBeInTheDocument();
        expect(screen.queryByText("Louis Martin")).not.toBeInTheDocument();
    });

    it("affiche l'état vide quand rien ne correspond", async () => {
        requeteMock.mockResolvedValue(ADHERENTS);
        monter();
        await screen.findByText("Camille Dupont");

        fireEvent.change(screen.getByPlaceholderText("Rechercher un nom, un e-mail…"), { target: { value: "inconnu" } });
        expect(screen.getByText("Aucun adhérent ne correspond à cette recherche.")).toBeInTheDocument();
    });

    it("ouvre l'invitation vide, puis l'édition pré-remplie depuis les actions", async () => {
        requeteMock.mockResolvedValue(ADHERENTS);
        monter();
        await screen.findByText("Camille Dupont");

        fireEvent.click(screen.getByRole("button", { name: "Inviter des adhérents" }));
        expect(screen.getByRole("button", { name: "Invitation unique" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Invitation unique" }));
        expect(screen.getByLabelText("Prénom")).toHaveValue("");
        fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
        expect(screen.queryByLabelText("Prénom")).not.toBeInTheDocument();

        fireEvent.click(screen.getAllByRole("button", { name: "Modifier l'utilisateur" })[0]);
        fireEvent.click(screen.getByRole("button", { name: /Éditer les informations/ }));
        expect(screen.getByLabelText("Prénom")).toHaveValue("Camille");
        expect(screen.getByLabelText("Adresse e-mail")).toHaveValue("camille.dupont@exemple.com");
    });
});
