/**
 * Page publique : liste des actualités du club (news + recommandations).
 * Accessible sans compte — ne montre jamais la catégorie "actu_interne".
 *
 * Prérequis :
 * 1. lucide-react installé.
 * 2. react-router-dom.
 * 3. Remplacer `chargerArticlesPublics` par un vrai appel API
 *    (ex. GET /api/articles?statut=publie&categorie=actu_publique,recommandation).
 * 4. Route suggérée : /actualites (correspond au lien "Nos actualités" de la Navbar).
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, ArrowRight, Lightbulb, Plus, Loader2 } from "lucide-react";
import { useRequete } from "../../fonctions/requete";
import { LABEL_CATEGORIE, STYLE_BADGE, ICONE_CATEGORIE, ONGLETS, type ArticlePublic } from "../../constantes/types/blog";
import { useAuth } from "../../contexts/AuthContext";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import SEO from "../../composants/generale/SEO";

/**
 * Composant Squelette représentant une carte d'article grisée
 */
function CarteSqueletteArticle() {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-club-100 bg-white">
            {/* Image grisée */}
            <div className="h-40 w-full animate-pulse bg-gray-200" />

            {/* Contenu textuel grisé */}
            <div className="flex flex-1 flex-col gap-3 p-4">
                {/* Date */}
                <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />

                {/* Titre (2 lignes) */}
                <div className="space-y-1.5">
                    <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                </div>

                {/* Description */}
                <div className="space-y-1.5 pt-1">
                    <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-gray-200" />
                </div>

                {/* Lien de lecture */}
                <div className="mt-auto pt-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                </div>
            </div>
        </div>
    );
}

export default function Blog() {
    const [articles, setArticles] = useState<ArticlePublic[] | null>(null);
    const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]["value"]>("tous");
    const [JSON, setJSON] = useState<any>(null);
    const [chargementArticle, setChargementArticle] = useState<string>("")

    const requeteJSON = useRequeteJSON();
    const requete = useRequete();
    const { role } = useAuth();

    useEffect(() => {
        document.title = "Blog — Running Vincennes Association";

        async function recuperer() {
            try {
                // 1. requeteJSON met à jour le state via le callback (cache + serveur)
                const jsonInitial = await requeteJSON("blog", (nouvellesDonnees) => {
                    if (nouvellesDonnees) setJSON(nouvellesDonnees);
                });

                if (jsonInitial) setJSON(jsonInitial);

                // 2. On utilise AWAIT pour la requête d'articles réseau
                const articlesDonnees = await requete({ url: "/articles/recuperer-tous-articles" });

                // 3. On met à jour la liste des articles
                setArticles(articlesDonnees);
            } catch (error) {
                console.error("Erreur lors de la récupération du blog :", error);
            }
        }

        recuperer();
    }, []);

    const articlesFiltres = useMemo(() => {
        if (!articles) return [];
        return articles
            .filter((a) => onglet === "tous" || a.categorie === onglet)
            .sort((a, b) => (a.datePublication < b.datePublication ? 1 : -1));
    }, [articles, onglet]);

    return (
        <>
            <SEO
                titre="Blog — Running Vincennes Association"
                description="Retrouvez nos derniers articles, conseils d'entraînement, retours d'expérience sur les marathons et actualités du club Running Vincennes Association."
                chemin="/blog"
            />

            <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 sm:py-12">
                {/* En-tête */}
                <header className="mb-4 sm:mb-8 min-h-[96px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="max-w-2xl w-full">
                        {JSON?.titre ? (
                            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#040F33]">
                                {JSON.titre}
                            </h1>
                        ) : (
                            <div className="h-8 w-2/3 animate-pulse rounded bg-gray-200 sm:h-10" />
                        )}

                        {JSON?.description ? (
                            <p className="mt-2 text-sm sm:text-base text-[#0B2270]/70">
                                {JSON.description}
                            </p>
                        ) : (
                            <div className="mt-3 space-y-1.5">
                                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
                            </div>
                        )}
                    </div>

                    {role && (
                        <Link
                            to="/rediger-article"
                            className="flex w-full sm:w-auto shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700"
                        >
                            {role === "administrateur" ? (
                                <>
                                    <Plus size={18} />
                                    Ajouter un article
                                </>
                            ) : role === "adherent" ? (
                                <>
                                    <Lightbulb size={18} />
                                    Proposer un article
                                </>
                            ) : null}
                        </Link>
                    )}
                </header>

                {/* Filtres (défilables horizontalement sur mobile) */}
                <nav className="flex flex-wrap gap-2 mb-5">
                    {ONGLETS.filter((o) =>
                        !role ? o.value !== "newsletter" && o.value !== "actu_interne" : true
                    ).map((o) => {
                        const Icone = o.value !== "tous" ? ICONE_CATEGORIE[o.value] : "";

                        return (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => setOnglet(o.value)}
                                className={`flex shrink-0 items-center justify-center gap-2 rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition whitespace-nowrap ${onglet === o.value
                                    ? "bg-club-600 text-white"
                                    : "bg-club-50 text-[#0B2270] hover:bg-club-100"
                                    }`}
                            >
                                {Icone !== "" && <Icone size={18} className="sm:w-5 sm:h-5" />}
                                {o.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Grille d'articles ou Squelettes de chargement (3 cartes) */}
                 {articles == null  ? (
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <CarteSqueletteArticle key={index} />
                        ))}
                    </div>
                ) : articlesFiltres.length === 0 ? (
                    <div className="flex flex-col items-center content-center gap-2 rounded-xl h-[342px] border border-dashed border-club-200 px-4 py-16 sm:py-20 text-center">
                        <Inbox size={28} className="text-[#0B2270]/30" />
                        <p className="text-sm text-[#0B2270]/60">
                            Aucune actualité dans cette catégorie pour le moment.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {articlesFiltres.map((a, key) => {
                            const Icone = ICONE_CATEGORIE[a.categorie];

                            return (
                                <Link
                                    key={key}
                                    to={`/article/${a.url}`}
                                    onClick={() => setChargementArticle(a.url)}
                                    className="group flex flex-col overflow-hidden rounded-xl border border-club-100 bg-white transition hover:-translate-y-0.5 hover:border-club-300 hover:shadow-md"
                                >
                                    {/* Bandeau image ou couleur */}
                                    <div className="relative h-40 w-full shrink-0 overflow-hidden bg-club-50">
                                        {chargementArticle == a.url ?
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-club-600" />
                                            </div> :
                                            a.imageUrl ? (
                                                <img
                                                    src={a.imageUrl}
                                                    alt=""
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-club-300">
                                                    <Icone size={32} />
                                                </div>
                                            )
                                        }
                                        <span
                                            className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STYLE_BADGE[a.categorie]
                                                }`}
                                        >
                                            {LABEL_CATEGORIE[a.categorie]}
                                        </span>
                                    </div>

                                    {/* Contenu */}
                                    <div className="flex flex-1 flex-col gap-2 p-4">
                                        <time
                                            dateTime={a.datePublication}
                                            className="text-xs text-[#0B2270]/50"
                                        >
                                            {new Date(a.datePublication).toLocaleDateString("fr-FR", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </time>
                                        <h2 className="font-display text-base font-semibold leading-snug text-[#040F33]">
                                            {a.titre}
                                        </h2>
                                        <p className="line-clamp-2 text-sm text-[#0B2270]/70">
                                            {a.description}
                                        </p>
                                        <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-medium text-club-600 transition group-hover:gap-2">
                                            Lire l'article
                                            <ArrowRight size={14} />
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}