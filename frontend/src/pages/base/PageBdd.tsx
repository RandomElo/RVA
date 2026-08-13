import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRequete } from "../../fonctions/requete";
import { Loader2 } from "lucide-react";
import Erreur404 from "../../composants/erreur/Erreur404";
import { contenuPropre } from "../../fonctions/sanitizeur";
import SEO from "../../composants/generale/SEO";

interface Page {
    contenuHtml: string;
    titre: string;
}

export default function PageBdd() {
    const { url } = useParams<{ url: string }>();
    const [donneesPage, setDonneesPage] = useState<Page | 404>();

    const requete = useRequete();

    useEffect(() => {
        async function recuperationDonnees() {
            if (!url) return;

            // Réinitialisation de l'état pour afficher le loader en cas de navigation dynamique
            setDonneesPage(undefined);

            try {
                const reponse = await requete({ url: `/pages/details?url=${url}` });

                if (reponse?.detail) {
                    setDonneesPage(reponse.detail);
                } else {
                    setDonneesPage(404);
                }
            } catch  {
                setDonneesPage(404);
            }
        }

        recuperationDonnees();
    }, [url]);

    // 1. État de chargement
    if (!donneesPage) {
        return (
            <>
                <SEO
                    titre="Chargement... — Running Vincennes Association"
                    description="Chargement de votre page sur Running Vincennes Association."
                    chemin={url ? `/${url}` : "/"}
                />
                <div className="flex flex-col items-center justify-center gap-3 py-24 text-club-900/60">
                    <Loader2 size={28} className="animate-spin text-club-600" />
                    <p className="text-sm">Chargement de la page…</p>
                </div>
            </>
        );
    }

    // 2. État d'erreur 404
    if (donneesPage === 404) {
        return (
            <>
                <SEO
                    titre="Page introuvable — Running Vincennes Association"
                    description="La page que vous recherchez n'existe pas ou a été déplacée."
                    chemin={url ? `/${url}` : "/404"}
                />
                <Erreur404 />
            </>
        );
    }

    // Extraction d'un résumé texte propre du HTML pour la meta description SEO (max ~160 chars)
    const descriptionSeo = donneesPage.contenuHtml
        .replace(/<[^>]*>/g, "") // Supprime les balises HTML
        .replace(/\s+/g, " ")    // Normalise les espaces
        .trim()
        .slice(0, 160);

    // 3. Affichage normal de la page de la BDD
    return (
        <>
            <SEO
                titre={`${donneesPage.titre} — Running Vincennes Association`}
                description={descriptionSeo || `Consultez la page ${donneesPage.titre} de l'association Running Vincennes.`}
                chemin={`/${url}`}
            />

            <article className="mx-auto max-w-2xl px-6 py-12">
                <header className="mb-6">
                    <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-[#040F33] sm:text-4xl">
                        {donneesPage.titre}
                    </h1>
                </header>

                <div
                    className="prose prose-sm sm:prose-base max-w-none prose-headings:font-display prose-a:text-club-600"
                    dangerouslySetInnerHTML={{ __html: contenuPropre(donneesPage.contenuHtml) }}
                />
            </article>
        </>
    );
}