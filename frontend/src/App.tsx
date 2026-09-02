import { createBrowserRouter, RouterProvider, type Params } from "react-router-dom";
import { lazy, Suspense } from "react";

// Contextes
import { ResponsiveProvider } from "./contexts/ReponsiveContext";
import { ErreurProvider } from "./contexts/ErreurContext";
import { AuthProvider } from "./contexts/AuthContext";
import { HelmetProvider } from 'react-helmet-async';
import { PageProtegee } from "./composants/PageProtegee";

// Layout & Composants de structure (Requis au 1er affichage)
import Generale from "./composants/generale/Generale";
import ErreurElement from "./composants/erreur/ErreurElement";

// ⚡ 1. SEULE LA PAGE D'ACCUEIL EST EN EAGER LOADING
import Accueil from "./pages/base/Accueil";

// 💤 2. TOUTES LES AUTRES PAGES SONT EN LAZY LOADING (Inclus Blog, Calendrier, Connexion)

// Public principal
const Calendrier = lazy(() => import("./pages/Calendrier"));
const Blog = lazy(() => import("./pages/blog/Blog"));
const NosRessources = lazy(() => import("./pages/ressources/RessourcesEntrainement"));
const Connexion = lazy(() => import("./pages/base/Connexion"));
const HistoireDuClub = lazy(() => import("./pages/NotreHistoire"));
const Contact = lazy(() => import("./pages/base/ContactezNous"));
const NosPartenaires = lazy(() => import("./pages/NosPartenaires"));

// Administration
const AdminAccueil = lazy(() => import("./pages/administration/InterfaceAdministration"));
const AdministrationElement = lazy(() => import("./pages/administration/AdministrationElement"));
const Statistiques = lazy(() => import("./pages/administration/Statistiques"));
const EditionTextesPage = lazy(() => import("./pages/administration/EditionPage"));
const GestionImages = lazy(() => import("./pages/administration/GestionImages"));
const GestionPages = lazy(() => import("./pages/administration/GestionPages"));
const Helloasso = lazy(() => import("./pages/administration/Helloasso"));

// Espace Adhérents & Rédaction
const Trombinoscope = lazy(() => import("./pages/ressources/Trombinoscope"));
const SpecialistesSante = lazy(() => import("./pages/ressources/SpecialistesSante"));
const RedactionArticle = lazy(() => import("./pages/blog/RedactionArticle"));
const Anniversaires = lazy(() => import("./pages/ressources/Anniversaires"));
const CategoriesFFA = lazy(() => import("./pages/ressources/CategoriesFFA"));

// Outils spécifiques & Calculateurs
const ArticleDetailPage = lazy(() => import("./pages/blog/ArticleDetail"));
const CalculateurVMA = lazy(() => import("./pages/ressources/Allures"));
const PlanEntrainement = lazy(() => import("./pages/ressources/PlanEntrainement"));
const TestsVMA = lazy(() => import("./pages/ressources/TestsVma"));

// Pages Juridiques & Technique
const Lexique = lazy(() => import("./pages/ressources/Lexique"));
const MentionsLegales = lazy(() => import("./pages/legal/MentionsLegales"));
const PolitiqueConfidentialite = lazy(() => import("./pages/legal/PolitiquesConfidentialite"));
const Cgu = lazy(() => import("./pages/legal/Cgu"));
const Credits = lazy(() => import("./pages/legal/Credits"));
const Token = lazy(() => import("./pages/Token"));
const PageBdd = lazy(() => import("./pages/base/PageBdd"));

// Fallback léger
const PageLoader = () => (
    <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent"></div>
    </div>
);

// Loaders asynchrones
async function loaderModifierArticle(params: Params<string>) {
    const { url } = params;
    const requete = await fetch("/articles/recuperer-article-admin/" + url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

    if (!requete.ok) throw new Response("Erreur lors de la récupération de l'article", { status: 500 });
    const reponse = await requete.json();
    if (!reponse.etat) throw new Response("Impossible de charger les données de l'article", { status: 500 });
    return reponse.detail;
}

async function loaderModifierPage(params: Params<string>) {
    const { url } = params;
    const requete = await fetch("/pages/details-admin/" + url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

    if (!requete.ok) throw new Response("Erreur lors de la récupération de l'article", { status: 500 });
    const reponse = await requete.json();
    if (!reponse.etat) throw new Response("Impossible de charger les données de l'article", { status: 500 });
    return reponse.detail;
}

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <Suspense fallback={<PageLoader />}>
                <Generale />
            </Suspense>
        ),
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
                    { path: "/administration/helloasso", element: <Helloasso /> },
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
                        <RouterProvider router={router} />
                    </AuthProvider>
                </ErreurProvider>
            </ResponsiveProvider>
        </HelmetProvider>
    );
}