import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArticleFormValue } from "../../constantes/types/blog";
import type { Role } from "../../constantes/types/auth";
import type { RequeteParametres } from "../../fonctions/requete";
import { MESSAGE_SLUG } from "../../fonctions/validationRedaction";
import RedactionArticle from "./RedactionArticle";

// Chaque test monte le formulaire complet avec l'éditeur Tiptap : lent dans jsdom quand toute la suite tourne en parallèle.
vi.setConfig({ testTimeout: 20000 });

const requeteMock = vi.fn<(parametres: RequeteParametres) => Promise<unknown>>();
const notifierMock = vi.fn();
const navigationMock = vi.fn();
let roleCourant: Role = "administrateur";
let donneesLoader: ArticleFormValue | undefined;
// Réponse renvoyée pour l'enregistrement (la galerie d'images reçoit toujours une liste vide).
let reponseEnregistrement: unknown = null;

vi.mock("../../fonctions/requete", () => ({
    useRequete: () => requeteMock,
}));

vi.mock("../../contexts/NotificationsContext", () => ({
    useNotifications: () => ({ notifier: notifierMock }),
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ role: roleCourant }),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
    ...(await importOriginal<typeof import("react-router-dom")>()),
    useLoaderData: () => donneesLoader,
    useNavigate: () => navigationMock,
}));

function monter(type?: "nouvelArticle" | "nouvellePage") {
    render(
        <MemoryRouter>
            <RedactionArticle type={type} />
        </MemoryRouter>,
    );
}

function saisir(nom: string, valeur: string) {
    fireEvent.change(nom === "Titre" ? screen.getByRole("textbox", { name: "Titre" }) : screen.getByLabelText(nom), { target: { value: valeur } });
}

/** Passe l'éditeur en mode HTML et y tape le contenu (plus simple à piloter que l'éditeur visuel dans jsdom). */
function saisirContenuHtml(html: string) {
    fireEvent.click(screen.getByRole("button", { name: "HTML" }));
    fireEvent.change(screen.getByPlaceholderText("<p>Mon paragraphe…</p>"), { target: { value: html } });
}

async function cliquer(nom: string | RegExp) {
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: nom }));
    });
}

/** Appels à l'API hors chargement de la galerie. */
function appelsEnregistrement(): RequeteParametres[] {
    return requeteMock.mock.calls.map(([parametres]) => parametres).filter((p) => p.url !== "/images/recuperer-galerie");
}

beforeEach(() => {
    requeteMock.mockReset();
    notifierMock.mockReset();
    navigationMock.mockReset();
    roleCourant = "administrateur";
    donneesLoader = undefined;
    reponseEnregistrement = null;
    requeteMock.mockImplementation(async ({ url }) => (url === "/images/recuperer-galerie" ? [] : reponseEnregistrement));
});

describe("RedactionArticle : article", () => {
    it("bloque la publication d'un formulaire vide et affiche les erreurs", async () => {
        monter();
        await cliquer("Publier l'article");

        expect(screen.getByText("Le titre est obligatoire.")).toBeInTheDocument();
        expect(screen.getByText("L'article ne peut pas être vide.")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("Au moins une erreur empêche la publication de l'article.");
        expect(appelsEnregistrement()).toEqual([]);
    });

    it("refuse un chemin d'accès invalide", async () => {
        monter();
        saisir("Titre", "Retour sur le Téléthon");
        saisir("Chemin d'accès", "Mon-Article");
        await cliquer("Publier l'article");

        expect(screen.getByText(MESSAGE_SLUG)).toBeInTheDocument();
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(appelsEnregistrement()).toEqual([]);
    });

    it("refuse une description de plus de 20 mots", async () => {
        monter();
        saisir("Titre", "Retour sur le Téléthon");
        saisir("Chemin d'accès", "telethon-2026");
        saisir("Description (fortement recommandé)", Array.from({ length: 21 }, (_, i) => "mot" + i).join(" "));
        saisirContenuHtml("<p>Bonjour</p>");
        await cliquer("Publier l'article");

        expect(screen.getByText("Description maximum de 20 mots.")).toBeInTheDocument();
        expect(appelsEnregistrement()).toEqual([]);
    });

    it("publie l'article, notifie le succès puis ouvre l'article", async () => {
        reponseEnregistrement = { article: true, detail: "Article publié", donnees: "/article/telethon-2026" };
        monter();
        saisir("Titre", "Retour sur le Téléthon");
        saisir("Chemin d'accès", "telethon-2026");
        saisirContenuHtml("<p>Bonjour</p>");
        await cliquer("Publier l'article");

        expect(appelsEnregistrement()).toEqual([
            {
                url: "/articles/cree",
                methode: "POST",
                corps: {
                    article: expect.objectContaining({ titre: "Retour sur le Téléthon", url: "telethon-2026", categorie: "actu_publique", contenuHtml: "<p>Bonjour</p>" }),
                    statut: "publie",
                },
            },
        ]);
        expect(notifierMock).toHaveBeenCalledWith({ type: "succes", titre: "Succès", description: "Article publié" });
        expect(navigationMock).toHaveBeenCalledWith("/article/telethon-2026");
    });

    it("enregistre un brouillon sans validation et revient au blog", async () => {
        reponseEnregistrement = { article: true, detail: "Brouillon enregistré", donnees: [] };
        monter();
        await cliquer("Enregistrer en brouillon");

        expect(appelsEnregistrement()).toEqual([expect.objectContaining({ url: "/articles/cree", corps: expect.objectContaining({ statut: "brouillon" }) })]);
        expect(screen.queryByText("Le titre est obligatoire.")).not.toBeInTheDocument();
        expect(navigationMock).toHaveBeenCalledWith("/blog");
    });

    it("affiche l'erreur métier renvoyée par le backend sans quitter la page", async () => {
        reponseEnregistrement = { article: false, detail: "Ce chemin est déjà utilisé." };
        monter();
        saisir("Titre", "Retour sur le Téléthon");
        saisir("Chemin d'accès", "telethon-2026");
        saisirContenuHtml("<p>Bonjour</p>");
        await cliquer("Publier l'article");

        expect(notifierMock).toHaveBeenCalledWith({ type: "erreur", titre: "Erreur lors de l'enregistrement de l'article", description: "Ce chemin est déjà utilisé." });
        expect(navigationMock).not.toHaveBeenCalled();
    });

    it("sans réponse exploitable, ne notifie rien et réactive les boutons", async () => {
        monter();
        saisir("Titre", "Retour sur le Téléthon");
        saisir("Chemin d'accès", "telethon-2026");
        saisirContenuHtml("<p>Bonjour</p>");
        await cliquer("Publier l'article");

        expect(appelsEnregistrement()).toHaveLength(1);
        expect(notifierMock).not.toHaveBeenCalled();
        expect(navigationMock).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Publier l'article" })).toBeEnabled();
    });

    it("envoie la proposition d'un adhérent sur la route de suggestion", async () => {
        roleCourant = "adherent";
        reponseEnregistrement = { article: true, detail: "Merci pour votre proposition" };
        monter();
        expect(screen.queryByRole("button", { name: /^Newsletter/ })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /^Recommandation/ }));
        saisir("Titre", "Un bon podcast");
        saisir("Chemin d'accès", "un-bon-podcast");
        saisirContenuHtml("<p>À écouter</p>");
        await cliquer("Proposer l'article");

        expect(appelsEnregistrement()).toEqual([expect.objectContaining({ url: "/articles/suggestion", corps: expect.objectContaining({ article: expect.objectContaining({ categorie: "recommandation" }) }) })]);
        expect(navigationMock).toHaveBeenCalledWith("/blog");
    });

    it("modifie un article chargé par le loader (contenu de l'éditeur visuel)", async () => {
        donneesLoader = {
            id: "42",
            titre: "Article existant",
            categorie: "actu_interne",
            url: "article-existant",
            imageUrl: "",
            urlCanva: "",
            contenuHtml: "<p>Contenu existant</p>",
            description: "",
            datePublication: "2026-01-05",
            dansNavigation: false,
        };
        reponseEnregistrement = { article: true, detail: "Article modifié", donnees: "/article/article-existant" };
        monter();

        expect(screen.getByRole("heading", { name: "Modifier l'article" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Enregistrer en brouillon" })).not.toBeInTheDocument();
        await cliquer("Publier l'article");

        expect(appelsEnregistrement()).toEqual([
            expect.objectContaining({
                url: "/articles/modifier",
                corps: expect.objectContaining({ id: "42", statut: "publie", article: expect.objectContaining({ contenuHtml: "<p>Contenu existant</p>" }) }),
            }),
        ]);
        expect(navigationMock).toHaveBeenCalledWith("/article/article-existant");
    });
});

describe("RedactionArticle : newsletter", () => {
    it("génère titre et chemin, n'exige pas de contenu et utilise la route newsletter", async () => {
        reponseEnregistrement = { article: true, detail: "Newsletter publiée", donnees: "/article/newsletter-mars-2026" };
        monter();
        fireEvent.click(screen.getByRole("button", { name: /^Newsletter/ }));
        saisir("Date de publication", "2026-03-15");

        await waitFor(() => expect(screen.getByRole("textbox", { name: "Titre" })).toHaveValue("Newsletter Mars 2026"));
        expect(screen.getByRole("textbox", { name: "Titre" })).toBeDisabled();
        expect(screen.getByLabelText("Chemin d'accès")).toHaveValue("newsletter-mars-2026");
        expect(screen.getByLabelText("URL Canvas")).toBeInTheDocument();
        expect(screen.getByText(/ne sont pas modifiables/)).toBeInTheDocument();

        await cliquer("Publier l'article");
        expect(appelsEnregistrement()).toEqual([
            expect.objectContaining({
                url: "/articles/cree-newsletter",
                corps: expect.objectContaining({ article: expect.objectContaining({ titre: "Newsletter Mars 2026", url: "newsletter-mars-2026", categorie: "newsletter" }) }),
            }),
        ]);
        expect(navigationMock).toHaveBeenCalledWith("/article/newsletter-mars-2026");
    });

    it("vide titre et chemin en quittant la catégorie newsletter", async () => {
        monter();
        fireEvent.click(screen.getByRole("button", { name: /^Newsletter/ }));
        await waitFor(() => expect(screen.getByRole("textbox", { name: "Titre" })).not.toHaveValue(""));

        fireEvent.click(screen.getByRole("button", { name: /^Actu club/ }));
        await waitFor(() => expect(screen.getByRole("textbox", { name: "Titre" })).toHaveValue(""));
        expect(screen.getByLabelText("Chemin d'accès")).toHaveValue("");
    });
});

describe("RedactionArticle : album photo", () => {
    it("remplace l'éditeur par l'album et envoie les photos sur la route album", async () => {
        reponseEnregistrement = { article: true, detail: "Album publié", donnees: "/article/album-telethon" };
        monter();
        fireEvent.click(screen.getByRole("button", { name: /^Album photo/ }));

        expect(screen.queryByRole("button", { name: "HTML" })).not.toBeInTheDocument();
        saisir("Titre", "Album du Téléthon");
        saisir("Chemin d'accès", "album-telethon");
        await cliquer("Publier l'article");

        expect(appelsEnregistrement()).toEqual([
            {
                url: "/articles/cree-album",
                methode: "POST",
                corps: { article: expect.objectContaining({ categorie: "album_photo", titre: "Album du Téléthon" }), statut: "publie", photosAlbum: null },
            },
        ]);
        expect(navigationMock).toHaveBeenCalledWith("/article/album-telethon");
    });
});

describe("RedactionArticle : page statique", () => {
    it("affiche les erreurs de validation sans appeler l'API", async () => {
        monter("nouvellePage");
        await cliquer("Enregistrer la page");

        expect(screen.getByText("Le titre est obligatoire.")).toBeInTheDocument();
        expect(screen.getByText("L'article ne peut pas être vide.")).toBeInTheDocument();
        expect(screen.queryByText("Choisissez une date de publication.")).not.toBeInTheDocument();
        expect(appelsEnregistrement()).toEqual([]);
    });

    it("crée la page et ouvre son chemin", async () => {
        reponseEnregistrement = { page: true, detail: "Page créée" };
        monter("nouvellePage");
        saisir("Titre", "Stage d'été");
        saisir("Chemin d'accès", "stage-ete");
        fireEvent.click(screen.getByRole("radio", { name: /Ajouter à la barre de navigation/ }));
        saisirContenuHtml("<p>Programme</p>");
        await cliquer("Enregistrer la page");

        expect(appelsEnregistrement()).toEqual([
            {
                url: "/pages/creation",
                methode: "POST",
                corps: { contenuHtml: "<p>Programme</p>", dansNavigation: true, titre: "Stage d'été", url: "stage-ete" },
            },
        ]);
        expect(notifierMock).toHaveBeenCalledWith({ type: "succes", titre: "Succès", description: "Page créée" });
        expect(navigationMock).toHaveBeenCalledWith("/stage-ete");
    });

    it("modifie une page existante en transmettant son ancien chemin", async () => {
        donneesLoader = {
            titre: "Stage d'été",
            categorie: "actu_publique",
            url: "stage-ete",
            contenuHtml: "<p>Programme</p>",
            description: "",
            datePublication: "",
            dansNavigation: false,
        };
        reponseEnregistrement = { page: true, detail: "Page modifiée" };
        monter("nouvellePage");
        saisir("Chemin d'accès", "stage-ete-2026");
        await cliquer("Enregistrer la page");

        expect(appelsEnregistrement()).toEqual([
            {
                url: "/pages/modification",
                methode: "POST",
                corps: { contenuHtml: "<p>Programme</p>", dansNavigation: false, titre: "Stage d'été", url: "stage-ete-2026", ancienneUrl: "stage-ete" },
            },
        ]);
        expect(navigationMock).toHaveBeenCalledWith("/stage-ete-2026");
    });

    it("sans réponse exploitable, ne notifie rien et réactive le bouton", async () => {
        monter("nouvellePage");
        saisir("Titre", "Stage d'été");
        saisir("Chemin d'accès", "stage-ete");
        saisirContenuHtml("<p>Programme</p>");
        await cliquer("Enregistrer la page");

        expect(appelsEnregistrement()).toHaveLength(1);
        expect(notifierMock).not.toHaveBeenCalled();
        expect(navigationMock).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Enregistrer la page" })).toBeEnabled();
    });
});
