import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./AuthContext";

// Réponse minimale : seul json() est lu par AuthProvider
function reponseJSON(corps: unknown) {
    return { json: () => Promise.resolve(corps) } as unknown as Response;
}

function stubFetch(corps: unknown) {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(reponseJSON(corps)));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function Consommateur() {
    const { estAuth, role, chargement, deconnexion } = useAuth();
    return (
        <div>
            <p data-testid="auth">{String(estAuth)}</p>
            <p data-testid="role">{String(role)}</p>
            <p data-testid="chargement">{String(chargement)}</p>
            <button type="button" onClick={deconnexion}>
                Déconnexion
            </button>
        </div>
    );
}

async function monter() {
    const rendu = render(
        <AuthProvider>
            <Consommateur />
        </AuthProvider>,
    );
    // Laisse la vérification initiale (fetch + json) se terminer
    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });
    return rendu;
}

describe("AuthProvider / useAuth", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("est en chargement avant la réponse du backend", () => {
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
        render(
            <AuthProvider>
                <Consommateur />
            </AuthProvider>,
        );

        expect(screen.getByTestId("chargement")).toHaveTextContent("true");
        expect(screen.getByTestId("auth")).toHaveTextContent("false");
    });

    it("authentifie et renseigne le rôle quand le backend renvoie un rôle", async () => {
        const fetchMock = stubFetch({ etat: true, detail: "administrateur" });
        await monter();

        expect(fetchMock).toHaveBeenCalledWith("/utilisateurs/verification", expect.objectContaining({ method: "GET", credentials: "include" }));
        expect(screen.getByTestId("auth")).toHaveTextContent("true");
        expect(screen.getByTestId("role")).toHaveTextContent("administrateur");
        expect(screen.getByTestId("chargement")).toHaveTextContent("false");
    });

    it("n'authentifie pas quand detail vaut false", async () => {
        stubFetch({ etat: true, detail: false });
        await monter();

        expect(screen.getByTestId("auth")).toHaveTextContent("false");
        expect(screen.getByTestId("role")).toHaveTextContent("null");
        expect(screen.getByTestId("chargement")).toHaveTextContent("false");
    });

    it("n'authentifie pas et termine le chargement quand le réseau échoue", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        await monter();

        expect(screen.getByTestId("auth")).toHaveTextContent("false");
        expect(screen.getByTestId("role")).toHaveTextContent("null");
        expect(screen.getByTestId("chargement")).toHaveTextContent("false");
    });

    it("deconnexion() réinitialise l'état", async () => {
        stubFetch({ etat: true, detail: "adherent" });
        await monter();
        expect(screen.getByTestId("auth")).toHaveTextContent("true");

        fireEvent.click(screen.getByRole("button", { name: "Déconnexion" }));

        expect(screen.getByTestId("auth")).toHaveTextContent("false");
        expect(screen.getByTestId("role")).toHaveTextContent("null");
    });

    it("revérifie la connexion toutes les 30 secondes", async () => {
        const fetchMock = stubFetch({ etat: true, detail: "adherent" });
        await monter();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(29 * 1000);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("revérifie quand la page redevient visible, pas quand elle est masquée", async () => {
        const fetchMock = stubFetch({ etat: true, detail: "adherent" });
        const visibilite = vi.spyOn(document, "visibilityState", "get");
        await monter();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        visibilite.mockReturnValue("hidden");
        await act(async () => {
            document.dispatchEvent(new Event("visibilitychange"));
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        visibilite.mockReturnValue("visible");
        await act(async () => {
            document.dispatchEvent(new Event("visibilitychange"));
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("n'appelle plus le backend après le démontage", async () => {
        const fetchMock = stubFetch({ etat: true, detail: "adherent" });
        vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
        const { unmount } = await monter();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        unmount();
        document.dispatchEvent(new Event("visibilitychange"));
        await vi.advanceTimersByTimeAsync(90 * 1000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("useAuth lève une erreur hors d'un AuthProvider", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Consommateur />)).toThrow("useAuth doit être utilisé dans un AuthProvider");
    });
});
