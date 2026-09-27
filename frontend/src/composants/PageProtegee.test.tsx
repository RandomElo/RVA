import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "../constantes/types/auth";
import { PageProtegee } from "./PageProtegee";

type EtatAuth = { estAuth: boolean; role: Role; chargement: boolean };

let etatAuth: EtatAuth;

vi.mock("../contexts/AuthContext", () => ({
    useAuth: () => etatAuth,
}));

function monter(roleRequis?: string) {
    return render(
        <MemoryRouter initialEntries={["/protegee"]}>
            <Routes>
                <Route path="/" element={<p>Accueil</p>} />
                <Route path="/connexion" element={<p>Page de connexion</p>} />
                <Route path="/protegee" element={<PageProtegee roleRequis={roleRequis} />}>
                    <Route index element={<p>Contenu protégé</p>} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
}

describe("PageProtegee", () => {
    beforeEach(() => {
        etatAuth = { estAuth: false, role: null, chargement: false };
    });

    it("affiche le loader pendant la vérification de connexion", () => {
        etatAuth = { estAuth: false, role: null, chargement: true };
        const { container } = monter();

        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
        expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
        expect(screen.queryByText("Page de connexion")).not.toBeInTheDocument();
    });

    it("redirige vers /connexion si l'utilisateur n'est pas connecté", () => {
        monter();

        expect(screen.getByText("Page de connexion")).toBeInTheDocument();
        expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
    });

    it("affiche le contenu pour un utilisateur connecté sans rôle requis", () => {
        etatAuth = { estAuth: true, role: "adherent", chargement: false };
        monter();

        expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
    });

    it("redirige vers l'accueil si le rôle ne correspond pas", () => {
        etatAuth = { estAuth: true, role: "adherent", chargement: false };
        monter("administrateur");

        expect(screen.getByText("Accueil")).toBeInTheDocument();
        expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
    });

    it("affiche le contenu si le rôle correspond", () => {
        etatAuth = { estAuth: true, role: "administrateur", chargement: false };
        monter("administrateur");

        expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
    });
});
