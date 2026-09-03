/**
 * Page publique : histoire du club.
 * Contenu piloté par le JSON (notre-histoire.json).
 */

import { Flag, UserPlus, TrendingUp, MapPin, Bus, Heart, Users, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRequeteJSON } from "../fonctions/requeteJSON";
import SEO from "../composants/generale/SEO";

const NB_SLOTS = 20;

type EtapeTimeline = {
    annee: string;
    titre: string;
    description: string;
    icone: typeof Flag;
};

interface HistoireJSON extends Record<string, string | undefined> {
    titrePage?: string;
    introduction?: string;
    titrePartie2?: string;
    sousTitrePartie2?: string;
    textePartie2?: string;
    nomCourseCarte1?: string;
    lieuCourseCarte1?: string;
    descriptionCourseCarte1?: string;
    nomCourseCarte2?: string;
    lieuCourseCarte2?: string;
    descriptionCourseCarte2?: string;
    titrePartie3?: string;
    paragraphe1Partie3?: string;
    paragraphe2Partie3?: string;
}

// Données de secours par défaut garantissant un rendu immédiat pour Googlebot & CLS
const DONNEES_HISTOIRE_PAR_DEFAUT: HistoireJSON = {
    titrePage: "Notre histoire",
    introduction: "D'une poignée de coureurs à une communauté d'une centaine de membres - retour sur les grandes étapes du club.",
    datePoint1: "2010",
    titrePoint1: "Naissance du club",
    descriptionPoint1: "Une poignée de coureurs du quartier, réunis autour de l'envie de s'entraîner ensemble plutôt que seuls, décident de créer officiellement l'association.",
    datePoint2: "2012",
    titrePoint2: "Thomas nous a rejoint",
    descriptionPoint2: "Coach passionné, Thomas rejoint l'aventure et structure les entraînements par groupes de niveau.",
    datePoint3: "2015",
    titrePoint3: "5 000 km cumulés sur une saison",
    descriptionPoint3: "Grâce à l'engagement de tous les membres, le club franchit ensemble la barre des 5 000 km parcourus sur une seule saison.",
    datePoint4: "2020",
    titrePoint4: "Une communauté de ~130 coureurs",
    descriptionPoint4: "Le club rassemble aujourd'hui une centaine de membres, du débutant au coureur confirmé.",
    titrePartie2: "Convivialité et escapades running",
    sousTitrePartie2: "Parce que courir ensemble, c'est aussi partir ensemble",
    textePartie2: "Au-delà des entraînements hebdomadaires, le club aime se retrouver sur des courses un peu plus loin de Vincennes. Covoiturage, hébergement partagé, repas d'avant-course pris ensemble.",
    nomCourseCarte1: "Marseille-Cassis",
    lieuCourseCarte1: "Marseille",
    descriptionCourseCarte1: "Un week-end classique du club : départ groupé, hébergement partagé et une course mythique face à la mer.",
    nomCourseCarte2: "L'Ultra-Marin",
    lieuCourseCarte2: "Côtes-d'Armor",
    descriptionCourseCarte2: "Pour les plus téméraires, cette épreuve au bord de la mer est devenue un rendez-vous apprécié.",
    titrePartie3: "Un club à taille humaine, par choix",
    paragraphe1Partie3: "Le club aurait pu grandir bien plus vite. C'est un choix assumé de garder un nombre de membres maîtrisé.",
    paragraphe2Partie3: "Aujourd'hui, cela se traduit par un suivi de proximité par les entraîneurs, des groupes de niveau qui restent à taille raisonnable."
};

// Icônes utilisées pour la frise
const ICONES_TIMELINE = [Flag, UserPlus, TrendingUp, Sparkles, MapPin, Bus, Heart, Users];

/**
 * Reconstruit la frise chronologique dans l'ordre datePoint1 -> datePoint20.
 */
function construireTimeline(json: HistoireJSON): EtapeTimeline[] {
    const etapes: EtapeTimeline[] = [];

    for (let i = 1; i <= NB_SLOTS; i++) {
        const annee = json[`datePoint${i}`];
        const titre = json[`titrePoint${i}`];
        const description = json[`descriptionPoint${i}`];

        if (!titre || titre.trim() === "") {
            continue;
        }

        etapes.push({
            annee: annee ?? "",
            titre: titre.trim(),
            description: description ?? "",
            icone: ICONES_TIMELINE[etapes.length % ICONES_TIMELINE.length],
        });
    }

    return etapes;
}

export default function HistoireDuClub() {
    const [notreHistoireJSON, setNotreHistoireJSON] = useState<HistoireJSON>(DONNEES_HISTOIRE_PAR_DEFAUT);

    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        async function recuperation() {
            try {
                const donnees = await requeteJSON("notre-histoire", (nouvellesDonnees) => {
                    if (nouvellesDonnees) {
                        setNotreHistoireJSON((prev) => ({ ...prev, ...nouvellesDonnees }));
                    }
                });

                if (donnees) {
                    setNotreHistoireJSON((prev) => ({ ...prev, ...donnees }));
                }
            } catch (error) {
                console.error("Erreur lors du chargement de l'histoire :", error);
            }
        }

        recuperation();
    }, []);

    // Recalcul mémoïsé de la frise lors des mises à jour d'état
    const timeline = useMemo(() => {
        return construireTimeline(notreHistoireJSON);
    }, [notreHistoireJSON]);

    return (
        <>
            <SEO
                titre="Histoire & Présentation du Club — Running Vincennes Association"
                description="Découvrez l'histoire et les valeurs de Running Vincennes Association : un club passionné de course à pied dédié aux runners de tous niveaux au cœur du Val-de-Marne"
                chemin="/notre-histoire"
            />

            <div className="mx-auto max-w-3xl px-6 py-14">
                {/* En-tête */}
                <header className="mb-14 text-center">
                    <h1 className="mt-1 font-display text-3xl font-bold text-[#040F33] sm:text-4xl">
                        {notreHistoireJSON.titrePage ?? "Notre histoire"}
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-[#0B2270]/90">
                        {notreHistoireJSON.introduction}
                    </p>
                </header>

                {/* Timeline Container */}
                {timeline.length > 0 && (
                    <div className="relative mb-20 pl-12 sm:pl-14">
                        {/* Ligne verticale */}
                        <div
                            className="absolute left-4 top-4 bottom-4 w-0.5 -translate-x-1/2 bg-club-200 sm:left-2"
                            aria-hidden="true"
                        />

                        <ol className="flex flex-col gap-10">
                            {timeline.map((etape, i) => {
                                const Icone = etape.icone;
                                return (
                                    <li key={`${etape.titre}-${i}`} className="relative">
                                        {/* Pastille */}
                                        <span className="absolute -left-10 top-0 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-club-600 bg-white text-club-600 ring-4 ring-white sm:-left-12 sm:h-10 sm:w-10">
                                            <Icone size={16} />
                                        </span>

                                        <span className="text-xs font-semibold uppercase tracking-wide text-club-600">
                                            {etape.annee}
                                        </span>
                                        <h2 className="mt-1 font-display text-lg font-semibold text-[#040F33]">
                                            {etape.titre}
                                        </h2>
                                        <p className="mt-1.5 text-sm leading-relaxed text-[#0B2270]/90">
                                            {etape.description}
                                        </p>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                )}

                {/* Convivialité & courses lointaines */}
                <section className="mb-16">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
                            <Bus size={20} />
                        </div>
                        <div>
                            <h2 className="font-display text-xl font-bold text-[#040F33]">
                                {notreHistoireJSON.titrePartie2}
                            </h2>
                            <p className="text-sm text-club-700">
                                {notreHistoireJSON.sousTitrePartie2}
                            </p>
                        </div>
                    </div>

                    <p className="mb-6 text-sm leading-relaxed text-[#0B2270]/90">
                        {notreHistoireJSON.textePartie2}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-club-100 bg-white p-5">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-[#0B2270]/85">
                                <MapPin size={12} />
                                {notreHistoireJSON.lieuCourseCarte1}
                            </span>
                            <h3 className="mt-1.5 font-display text-base font-semibold text-[#040F33]">
                                {notreHistoireJSON.nomCourseCarte1}
                            </h3>
                            <p className="mt-1.5 text-sm text-[#0B2270]/90">
                                {notreHistoireJSON.descriptionCourseCarte1}
                            </p>
                        </div>

                        <div className="rounded-xl border border-club-100 bg-white p-5">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-[#0B2270]/85">
                                <MapPin size={12} />
                                {notreHistoireJSON.lieuCourseCarte2}
                            </span>
                            <h3 className="mt-1.5 font-display text-base font-semibold text-[#040F33]">
                                {notreHistoireJSON.nomCourseCarte2}
                            </h3>
                            <p className="mt-1.5 text-sm text-[#0B2270]/90">
                                {notreHistoireJSON.descriptionCourseCarte2}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Taille humaine */}
                <section className="rounded-2xl border border-club-100 bg-club-50/60 p-7 sm:p-8">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-club-100 text-club-600">
                            <Heart size={20} />
                        </div>
                        <h2 className="font-display text-xl font-bold text-[#040F33]">
                            {notreHistoireJSON.titrePartie3}
                        </h2>
                    </div>

                    <p className="mb-4 text-sm leading-relaxed text-[#0B2270]/90">
                        {notreHistoireJSON.paragraphe1Partie3}
                    </p>

                    <div className="flex items-start gap-2 text-sm text-[#0B2270]/90">
                        <Users size={16} className="mt-0.5 shrink-0 text-club-600" />
                        <p>{notreHistoireJSON.paragraphe2Partie3}</p>
                    </div>
                </section>
            </div>
        </>
    );
}