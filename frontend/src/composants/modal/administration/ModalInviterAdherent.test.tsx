import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Adherent } from "../../../constantes/types/adherents";
import ModalInviterAdherent from "./ModalInviterAdherent";

const requeteMock = vi.fn();

vi.mock("../../../fonctions/requete", () => ({
    useRequete: () => requeteMock,
}));

const adherentExemple: Adherent = {
    id: "1",
    prenom: "Camille",
    nom: "Dupont",
    mail: "camille.dupont@exemple.com",
    cheminTrombinoscope: "",
    derniereConnexion: "",
    dateNaissance: "15/03",
};

function monter() {
    const setter = vi.fn();
    const onFermer = vi.fn();
    render(<ModalInviterAdherent ouvert onFermer={onFermer} setter={setter} />);
    return { setter, onFermer };
}

function remplirFormulaire() {
    fireEvent.click(screen.getByRole("button", { name: "Invitation unique" }));
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Camille" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Dupont" } });
    fireEvent.change(screen.getByLabelText("Date de naissance"), { target: { value: "1503" } });
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), { target: { value: "camille.dupont@exemple.com" } });
}

async function envoyer() {
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Envoyer l'invitation" }));
    });
}

describe("ModalInviterAdherent (invitation unique)", () => {
    beforeEach(() => {
        requeteMock.mockReset();
    });

    it("met à jour la liste, ferme la modale et réinitialise le formulaire en cas de succès", async () => {
        requeteMock.mockResolvedValue([adherentExemple]);
        const { setter, onFermer } = monter();
        remplirFormulaire();
        await envoyer();

        expect(requeteMock).toHaveBeenCalledWith({
            url: "/utilisateurs/inviter",
            methode: "POST",
            corps: { prenom: "Camille", nom: "Dupont", mail: "camille.dupont@exemple.com", dateNaissance: "15/03" },
        });
        expect(setter).toHaveBeenCalledWith([adherentExemple]);
        expect(onFermer).toHaveBeenCalledTimes(1);
        // Réinitialisation : retour au mode CSV par défaut
        expect(screen.queryByLabelText("Prénom")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Envoyer les invitations" })).toBeInTheDocument();
    });

    it("affiche le message d'erreur renvoyé par le backend sans fermer la modale", async () => {
        requeteMock.mockResolvedValue({ inviter: "erreur", detail: "Cette adresse est déjà utilisée." });
        const { setter, onFermer } = monter();
        remplirFormulaire();
        await envoyer();

        expect(screen.getByText("Cette adresse est déjà utilisée.")).toBeInTheDocument();
        expect(setter).not.toHaveBeenCalled();
        expect(onFermer).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Envoyer l'invitation" })).toBeEnabled();
    });

    it("affiche l'avertissement, met à jour la liste et bloque un nouvel envoi tant que le formulaire n'est pas modifié", async () => {
        requeteMock.mockResolvedValue({ inviter: "avertissement", detail: "Le mail d'activation n'est pas parti.", donnees: [adherentExemple] });
        const { setter, onFermer } = monter();
        remplirFormulaire();
        await envoyer();

        expect(screen.getByRole("alert")).toHaveTextContent("Le mail d'activation n'est pas parti.");
        expect(setter).toHaveBeenCalledWith([adherentExemple]);
        expect(onFermer).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Envoyer l'invitation" })).toBeDisabled();
        // Le bouton secondaire passe de « Annuler » à « Fermer »
        expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
    });

    it("efface l'avertissement et réactive l'envoi dès qu'un champ est modifié", async () => {
        requeteMock.mockResolvedValue({ inviter: "avertissement", detail: "Le mail d'activation n'est pas parti.", donnees: [adherentExemple] });
        monter();
        remplirFormulaire();
        await envoyer();
        expect(screen.getByRole("button", { name: "Envoyer l'invitation" })).toBeDisabled();

        fireEvent.change(screen.getByLabelText("Adresse e-mail"), { target: { value: "dominique.martin@exemple.com" } });

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Envoyer l'invitation" })).toBeEnabled();

        requeteMock.mockResolvedValue([adherentExemple]);
        await envoyer();
        expect(requeteMock).toHaveBeenCalledTimes(2);
        expect(requeteMock).toHaveBeenLastCalledWith(expect.objectContaining({
            corps: expect.objectContaining({ mail: "dominique.martin@exemple.com" }),
        }));
    });

    it("n'appelle pas le backend si un champ est vide", async () => {
        monter();
        fireEvent.click(screen.getByRole("button", { name: "Invitation unique" }));
        await envoyer();

        expect(requeteMock).not.toHaveBeenCalled();
        expect(screen.getByText("Merci de renseigner le prénom, le nom, la date de naissance et l'adresse e-mail.")).toBeInTheDocument();
    });
});
