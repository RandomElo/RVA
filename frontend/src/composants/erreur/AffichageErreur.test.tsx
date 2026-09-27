import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import ErreurRequete from "../../classes/ErreurRequete";
import AffichageErreur from "./AffichageErreur";

let erreurCourante: Error | null = null;

vi.mock("../../contexts/ErreurContext", () => ({
    useErreur: () => ({ erreur: erreurCourante, setErreur: vi.fn() }),
}));

function monter(erreur: Error | null) {
    erreurCourante = erreur;
    return render(
        <MemoryRouter>
            <AffichageErreur>
                <p>Contenu</p>
            </AffichageErreur>
        </MemoryRouter>,
    );
}

describe("AffichageErreur", () => {
    it("affiche le contenu quand il n'y a pas d'erreur", () => {
        monter(null);
        expect(screen.getByText("Contenu")).toBeInTheDocument();
    });

    it("affiche la page 404 pour une ErreurRequete 404", () => {
        monter(new ErreurRequete(404, "Ressource introuvable"));
        expect(screen.getByRole("heading", { name: "Hors-piste !" })).toBeInTheDocument();
    });

    it("affiche l'accès refusé pour une ErreurRequete 403", () => {
        monter(new ErreurRequete(403, "Accès interdit"));
        expect(screen.getByRole("heading", { name: "Dossard requis" })).toBeInTheDocument();
    });

    it("garde la page d'erreur générique pour une ErreurRequete 400", () => {
        monter(new ErreurRequete(400, "Requête incorrecte"));
        expect(screen.getByRole("heading", { name: "DNF du serveur" })).toBeInTheDocument();
    });
});
