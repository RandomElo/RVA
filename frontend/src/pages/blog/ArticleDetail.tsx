/**
 * Page publique : détail d'un article.
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, User } from "lucide-react";
import Erreur404 from "../../composants/erreur/Erreur404";
import SEO from "../../composants/generale/SEO";
import { useRequete } from "../../fonctions/requete";
import { contenuPropre } from "../../fonctions/sanitizeur";
import { ICONE_CATEGORIE, LABEL_CATEGORIE, STYLE_BADGE, type ArticleFormValue } from "../../constantes/types/blog";
import RecupererNewsletter from "../../composants/blog/RecupererNewsletter";
import Album from "../../composants/blog/Album";

export default function ArticleDetailPage() {
    const { url } = useParams<{ url: string }>();
    const [article, setArticle] = useState<ArticleFormValue | null | undefined>(undefined);

    const requete = useRequete();

    useEffect(() => {
        let annule = false;

        async function recupererArticle() {
            if (!url) return;

            // On ne réinitialise à `undefined` que si on change d'URL pour éviter le flash
            setArticle(undefined);

            try {
                const articleDonnees = await requete({ url: "/articles/recuperer-article/" + url });
                if (!annule) {
                    setArticle(articleDonnees ?? null);
                }
            } catch {
                if (!annule) {
                    setArticle(null);
                }
            }
        }

        recupererArticle();

        return () => {
            annule = true; // Empêche de mettre à jour le state si le composant s'est démonté
        };
        // ⚠️ Ne pas inclure `requete` si useRequete() n'est pas mémoïsé avec useCallback dans son hook
        // eslint-disable-next-next-line react-hooks/exhaustive-deps
    }, [url]);

    // 1. État de chargement
    if (article === undefined) {
        return (
            <>
                <SEO
                    titre="Chargement de l'article... — Running Vincennes Association"
                    description="Lecture de l'actualité en cours sur Running Vincennes Association."
                    chemin={url ? `/blog/${url}` : "/blog"}
                />
                <div className="flex flex-1 items-center justify-center gap-2 py-24 text-sm text-[#0B2270]/60">
                    <Loader2 size={18} className="animate-spin text-club-600" />
                    Chargement de l'article…
                </div>
            </>
        );
    }

    // 2. État d'erreur / Article non trouvé
    if (article === null) {
        return (
            <>
                <SEO
                    titre="Article introuvable — Running Vincennes Association"
                    description="L'article que vous cherchez n'existe pas ou n'est plus disponible."
                    chemin={url ? `/blog/${url}` : "/404"}
                />
                <Erreur404 />
            </>
        );
    }

    const Icone = ICONE_CATEGORIE[article.categorie];

    // Extrait texte pour la meta description SEO (nettoyage HTML)
    const descriptionSeo = article.contenuHtml
        ? article.contenuHtml
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160)
        : `Découvrez l'article "${article.titre}" publié sur Running Vincennes Association.`;

    return (
        <>
            <SEO
                titre={`${article.titre} — Running Vincennes Association`}
                description={descriptionSeo}
                chemin={`/blog/${url}`}
                image={article.imageUrl}
            />

            <article className="mx-auto max-w-2xl px-6 py-12">
                <Link
                    to="/blog"
                    className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#0B2270]/70 transition hover:text-club-600"
                >
                    <ArrowLeft size={14} />
                    Retour au blog
                </Link>

                {/* En-tête */}
                <header className="mb-6">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STYLE_BADGE[article.categorie]}`}>
                        <Icone size={12} />
                        {LABEL_CATEGORIE[article.categorie]}
                    </span>
                    <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-[#040F33] sm:text-4xl">
                        {article.titre}
                    </h1>
                    <div className="mt-3 flex items-center gap-3 text-sm text-[#0B2270]/60">
                        <span className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            {new Date(article.datePublication).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                        {article.categorie === "solde" && (
                            <span className="flex items-center gap-1.5">
                                <User size={14} />
                                par Kirsi Shop
                            </span>
                        )}
                    </div>
                </header>

                {/* Image de couverture */}
                {article.imageUrl && (
                    <img
                        src={article.imageUrl}
                        alt={article.titre}
                        className="mb-8 h-64 w-full rounded-xl object-cover sm:h-80"
                    />
                )}

                {/* Contenu */}
                {article.categorie === "newsletter" ? (
                    <RecupererNewsletter chemin={article.contenuHtml} />
                ) : article.categorie == "album_photo" ? (
                    <Album images={JSON.parse(article.contenuHtml)} />
                ) : (
                    <div
                        className="prose prose-sm sm:prose-base max-w-none prose-headings:font-display prose-a:text-club-600"
                        dangerouslySetInnerHTML={{ __html: contenuPropre(article.contenuHtml) }}
                    />
                )}
            </article>
        </>
    );
}