import { createBrowserRouter, RouterProvider, type Params } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { lazy, Suspense } from "react";

// Contextes
import { ResponsiveProvider } from "./contexts/ReponsiveContext";
import { ErreurProvider } from "./contexts/ErreurContext";
import { AuthProvider } from "./contexts/AuthContext";
import { HelmetProvider } from 'react-helmet-async';
import { PageProtegee } from "./composants/PageProtegee";

// Layout & Composants de structure
import Generale from "./composants/generale/Generale";
import ErreurElement from "./composants/erreur/ErreurElement";

// ⚡ 1. PAGES EN CHARGEMENT DIRECT (Eager Loading)
// Visibles en 1 clic depuis le menu principal -> Navigation ultra-fluide !
import Accueil from "./pages/base/Accueil";
import HistoireDuClub from "./pages/NotreHistoire";
import Contact from "./pages/base/ContactezNous";
import Calendrier from "./pages/Calendrier";
import Blog from "./pages/blog/Blog";
import NosPartenaires from "./pages/NosPartenaires";
import NosRessources from "./pages/ressources/RessourcesEntrainement";
import Connexion from "./pages/base/Connexion";

// 💤 2. PAGES EN LAZY LOADING (Chargées à la demande)

// A. Administration (Inutile pour 95% des visiteurs)
const AdminAccueil = lazy(() => import("./pages/administration/InterfaceAdministration"));
const AdministrationElement = lazy(() => import("./pages/administration/AdministrationElement"));
const Statistiques = lazy(() => import("./pages/administration/Statistiques"));
const EditionTextesPage = lazy(() => import("./pages/administration/EditionPage"));
const GestionImages = lazy(() => import("./pages/administration/GestionImages"));
const GestionPages = lazy(() => import("./pages/administration/GestionPages"));

// B. Espace Adhérents & Rédaction
const Trombinoscope = lazy(() => import("./pages/ressources/Trombinoscope"));
const SpecialistesSante = lazy(() => import("./pages/ressources/SpecialistesSante"));
const RedactionArticle = lazy(() => import("./pages/blog/RedactionArticle"));
const Anniversaires = lazy(() => import("./pages/ressources/Anniversaires"));
const CategoriesFFA = lazy(() => import("./pages/ressources/CategoriesFFA"));

// C. Outils spécifiques & Calculateurs (Contiennent du JS plus lourd)
const ArticleDetailPage = lazy(() => import("./pages/blog/ArticleDetail"));
const CalculateurVMA = lazy(() => import("./pages/ressources/Allures"));
const PlanEntrainement = lazy(() => import("./pages/ressources/PlanEntrainement"));
const TestsVMA = lazy(() => import("./pages/ressources/TestsVma"));

// D. Pages Juridiques & Techniques (Visites très rares)
const Lexique = lazy(() => import("./pages/ressources/Lexique"));
const MentionsLegales = lazy(() => import("./pages/legal/MentionsLegales"));
const PolitiqueConfidentialite = lazy(() => import("./pages/legal/PolitiquesConfidentialite"));
const Cgu = lazy(() => import("./pages/legal/Cgu"));
const Credits = lazy(() => import("./pages/legal/Credits"));
const Token = lazy(() => import("./pages/Token"));
const PageBdd = lazy(() => import("./pages/base/PageBdd"));

// Composant fallback pour le chargement des chunks
const PageLoader = () => (
    <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent"></div>
    </div>
);
async function loaderModifierArticle(params: Params<string>) {

    const { url } = params;
    const requete = await fetch("/articles/recuperer-article-admin/" + url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });

    if (!requete.ok) {
        throw new Response("Erreur lors de la récupération de l'article", {
            status: 500,
        });
    }
    const reponse = await requete.json();
    if (!reponse.etat) {
        throw new Response("Impossible de charger les données de l'article", {
            status: 500,
        });
    }
    return reponse.detail;
}

async function loaderModifierPage(params: Params<string>) {

    const { url } = params;
    const requete = await fetch("/pages/details-admin/" + url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });

    if (!requete.ok) {
        throw new Response("Erreur lors de la récupération de l'article", {
            status: 500,
        });
    }
    const reponse = await requete.json();
    if (!reponse.etat) {
        throw new Response("Impossible de charger les données de l'article", {
            status: 500,
        });
    }
    return reponse.detail;
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <Suspense fallback={<PageLoader />}> <Generale /></Suspense>,
        errorElement: <ErreurElement />,
        children: [
            // --- ROUTES PUBLIQUES ---
            { path: "/", element: <Accueil /> },
            { path: "/notre-histoire", element: <HistoireDuClub /> },
            { path: "/contactez-nous", element: <Contact /> },
            { path: "/nos-partenaires", element: <NosPartenaires /> },
            { path: "/calendrier", element: <Calendrier /> },
            { path: "/blog", element: <Blog /> },
            { path: "/article/:url", element: <ArticleDetailPage /> },
            { path: "/connexion", element: <Connexion /> },

            // Ressources Publiques
            { path: "/ressources", element: <NosRessources /> },
            { path: "/ressources/plan-entrainement", element: <PlanEntrainement /> },
            { path: "/ressources/tests-vma", element: <TestsVMA /> },
            { path: "/ressources/vma", element: <CalculateurVMA /> },
            { path: "/ressources/lexique", element: <Lexique /> },
            { path: "/ressources/categories-ffa", element: <CategoriesFFA /> },

            // --- ROUTES ADHÉRENTS (Protégées) ---
            {
                element: <PageProtegee />,
                children: [
                    { path: "/ressources/specialistes-sante", element: <SpecialistesSante /> },
                    { path: "/ressources/trombinoscope", element: <Trombinoscope /> },
                    { path: "/ressources/anniversaires", element: <Anniversaires /> },
                    { path: "/rediger-article", element: <RedactionArticle /> },
                ],
            },

            // --- ROUTES ADMINISTRATEUR (Protégées) ---
            {
                element: <PageProtegee roleRequis="administrateur" />,
                children: [
                    { path: "/administration", element: <AdminAccueil /> },
                    { path: "/administration/blog", element: <AdministrationElement mode="blog" /> },
                    { path: "/administration/courses", element: <AdministrationElement mode="courses" /> },
                    { path: "/administration/adherents", element: <AdministrationElement mode="adherents" /> },
                    { path: "/administration/specialistes-sante", element: <AdministrationElement mode="specialistesSante" /> },
                    { path: "/administration/statistiques", element: <Statistiques /> },
                    { path: "/administration/edition-page/*", element: <EditionTextesPage /> },
                    { path: "/administration/images", element: <GestionImages /> },
                    { path: "/administration/pages", element: <GestionPages /> },
                    { path: "/administration/creation-page", element: <RedactionArticle type="nouvellePage" /> },
                    {
                        path: "/administration/modifier-article/:url",
                        element: <RedactionArticle />,
                        loader: async ({ params }) => loaderModifierArticle(params),
                    },
                    {
                        path: "/administration/modifier-page/:url",
                        element: <RedactionArticle type="nouvellePage" />,
                        loader: async ({ params }) => loaderModifierPage(params),
                    },
                ],
            },
            // --- PAGES LÉGALES ---
            { path: "/mentions-legales", element: <MentionsLegales /> },
            { path: "/politique-confidentialite", element: <PolitiqueConfidentialite /> },
            { path: "/cgu", element: <Cgu /> },
            { path: "/credits", element: <Credits /> },

            // --- TECHNIQUE & ERREUR ---
            { path: "/t/:token", element: <Token /> },
            { path: "/:url", element: <PageBdd /> },
        ],
    },
]);

export default function App() {
    return (
        <HelmetProvider>
            <ResponsiveProvider>
                <ErreurProvider>
                    <AuthProvider>
                        <GoogleOAuthProvider clientId={import.meta.env.VITE_O_AUTH}>
                            <RouterProvider router={router} />
                        </GoogleOAuthProvider>
                    </AuthProvider>
                </ErreurProvider>
            </ResponsiveProvider>
        </HelmetProvider>
    );
}