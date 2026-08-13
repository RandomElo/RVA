import { useEffect, useMemo, useState } from "react";
import { Handshake, ExternalLink, Mail } from "lucide-react";
import type { PartenaireValide, StructureJSONPartenaires } from "../constantes/NosPartenaires";
import SEO from "../composants/generale/SEO";
import { useRequeteJSON } from "../fonctions/requeteJSON";

// Données par défaut pour un rendu immédiat et SEO-friendly
const DONNEES_PAR_DEFAUT: StructureJSONPartenaires = {
    titre: "Ils soutiennent le club",
    description: "Un grand merci à nos partenaires qui accompagnent le club au quotidien.",
    image1Partenaires: "/images/i/bc5d6d31-174d-4331-8f61-a754d8c8ec6b.webp",
    nom1Partenaires: "i-Run Maisons Alfort",
    descriptions1Partenaires: "Magasin spécialisé dans la course à pied, proposant chaussures, vêtements et équipements pour tous les coureurs.",
    lien1Partenraires: "https://www.i-run.fr/magasins/paris/maisons-alfort.html",
};

export default function NosPartenaires() {
    const [donnees, setDonnees] = useState<StructureJSONPartenaires>(DONNEES_PAR_DEFAUT);
    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        async function chargerDonnees() {
            try {
                const texteCacheInitial = await requeteJSON("nos-partenaires", (nouvellesDonnees) => {
                    if (nouvellesDonnees) {
                        setDonnees(nouvellesDonnees);
                    }
                });

                if (texteCacheInitial) {
                    setDonnees(texteCacheInitial);
                }
            } catch (error) {
                console.error("Erreur lors du chargement des partenaires :", error);
            }
        }

        chargerDonnees();
    }, []);

    // Extraire et nettoyer les données à chaque mise à jour de `donnees`
    const partenairesValides = useMemo<PartenaireValide[]>(() => {
        if (!donnees) return [];

        const liste: PartenaireValide[] = [];
        for (let i = 1; i <= 10; i++) {
            const nom = donnees[`nom${i}Partenaires`]?.trim();
            const lien = (donnees[`lien${i}Partenraires`] || donnees[`lien${i}Partenaires`])?.trim();
            const image = donnees[`image${i}Partenaires`]?.trim();
            const description = (
                donnees[`descriptions${i}Partenaires`] || donnees[`description${i}Partenaires`]
            )?.trim();

            if (nom && lien) {
                liste.push({ nom, lien, image, description });
            }
        }
        return liste;
    }, [donnees]);

    return (
        <>
            <SEO
                titre="Nos partenaires — Running Vincennes Association"
                description="Découvrez les entreprises, commerces et acteurs locaux qui soutiennent le club Running Vincennes Association et accompagnent nos athlètes au quotidien"
                chemin="/nos-partenaires"
            />

            <div className="font-body text-club-900 conteneurPage">
                {/* EN-TÊTE */}
                <section className="bg-club-600">
                    <div className="mx-auto max-w-6xl px-6 py-16">
                        <h1 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">
                            {donnees.titre || "Ils soutiennent le club"}
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-club-100 md:text-base">
                            {donnees.description || "Un grand merci à nos partenaires qui accompagnent le club au quotidien."}
                        </p>
                    </div>
                </section>

                {/* SECTION CONTENU */}
                <section className="mx-auto max-w-6xl px-6 py-16">
                    {partenairesValides.length > 0 ? (
                        /* GRILLE DE PARTENAIRES */
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                            {partenairesValides.map((partenaire, index) => (
                                <a
                                    key={index}
                                    href={partenaire.lien}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col overflow-hidden rounded-xl border border-club-100 bg-white transition-shadow hover:shadow-lg"
                                >
                                    <div className="relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden bg-club-50">
                                        {partenaire.image ? (
                                            <img
                                                src={partenaire.image}
                                                alt={partenaire.nom}
                                                className="h-full w-full object-contain p-6 transition duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <Handshake size={32} className="text-club-300" />
                                        )}
                                    </div>
                                    <div className="flex flex-1 flex-col p-5">
                                        <h2 className="font-display text-base font-semibold text-club-700">
                                            {partenaire.nom}
                                        </h2>
                                        {partenaire.description && (
                                            <p className="mt-2 flex-1 text-sm leading-relaxed text-club-900/75">
                                                {partenaire.description}
                                            </p>
                                        )}
                                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-500 group-hover:text-accent-700">
                                            Visiter le site <ExternalLink size={14} />
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        /* ETAT VIDE / MESSAGE SI AUCUN PARTENAIRE */
                        <div className="mx-auto max-w-md rounded-2xl border border-club-100 bg-white p-8 text-center shadow-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-club-50 text-club-600">
                                <Handshake size={24} />
                            </div>
                            <h2 className="mt-4 font-display text-xl font-bold text-club-900">
                                Aucun partenaire pour le moment
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-club-900/70">
                                Vous souhaitez associer l'image de votre entreprise ou commerce à notre club et soutenir nos athlètes au quotidien ?
                            </p>
                            <a
                                href="/contactez-nous"
                                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-club-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-club-700"
                            >
                                <Mail size={16} />
                                Devenir partenaire / Nous contacter
                            </a>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}