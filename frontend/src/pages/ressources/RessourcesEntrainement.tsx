/**
 * Page : ressources en ligne.
 * Pour l'instant, un simple menu vers les futures sous-pages (chaque carte sera développée
 * séparément : plan de renfo, prépa marathon, tableau VMA, calculateur de performance…).
 *
 * Prérequis :
 * 1. lucide-react + react-router-dom.
 * 2. Adapter `href` de chaque ressource à la vraie route une fois la sous-page créée
 *    (pour l'instant certaines pointent vers des routes qui n'existent pas encore).
 * 3. Route suggérée : /ressources
 */

import { Link } from "react-router-dom";
import { Dumbbell, Route as RouteIcon, Gauge, BookOpen, Salad, ArrowRight, Clock, SportShoe, Loader2, UserRound, Stethoscope } from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import SEO from "../../composants/generale/SEO";
import { useAuth } from "../../contexts/AuthContext";


type Ressource = {
    id: string;
    titre: string;
    description: string;
    icone: typeof Dumbbell;
    href: string;
    disponible: boolean; // false = "bientôt disponible", carte visible mais non cliquable
};

const DONNEES_PAR_DEFAULT = {
    titre: "Ressources en ligne",
    description: "Des outils et des plans d'entraînement pour progresser à votre rythme, seul ou en complément des séances du club.",

    ressource1Titre: "Guide du débutant",
    ressource1Description: "Tout savoir pour bien démarrer la course à pied : matériel, échauffement, prévention des blessures.",

    ressource2Titre: "Lexique du coureur",
    ressource2Description: "Comprenez les principaux termes de la course à pied.",

    ressource3Titre: "Générateur de plan de préparation",
    ressource3Description: "Programmes (5 km, 10 km, 21 km et 42 km) adaptés à la VMA et au volume.",

    ressource4Titre: "Tableau des allures VMA",
    ressource4Description: "Retrouvez vos allures d'entraînement (endurance, seuil, fractionné) ou de course selon votre VMA.",

    ressource5Titre: "Différents tests VMA",
    ressource5Description: "Présentation et explications de ces différents tests.",

    ressource6Titre: "Nutrition du coureur",
    ressource6Description: "Conseils d'alimentation avant, pendant et après l'effort, et pour les jours de course.",

    ressource7Titre: "Trombinoscope",
    ressource7Description: "Découvrez les membres du club à travers une photo de chacun.",

    ressource8Titre: "Spécialistes de santé",
    ressource8Description: "Retrouvez les spécialistes de santé recommandés par les adhérents pour accompagner votre pratique de la course à pied."
}


export default function NosRessources() {
    const [ressourcesJSON, setRessourcesJSON] = useState<any>(DONNEES_PAR_DEFAULT)
    const [chargement, setChargement] = useState<string | null>(null)

    const requeteJSON = useRequeteJSON()
    const { estAuth } = useAuth()

    useEffect(() => {
        async function recuperation() {
            const donnees = await requeteJSON("ressources", (nouvellesDonnees) => {
                if (nouvellesDonnees) setRessourcesJSON(nouvellesDonnees)
            })
            if (donnees) setRessourcesJSON(donnees)

        }
        recuperation()
    }, []);

    const RESSOURCES: Ressource[] = useMemo(() => {
        return [
            // --- 1. ACCUEIL & DÉBUTANTS ---
            ...(estAuth
                ? [
                    {
                        id: "trombinoscope",
                        titre: ressourcesJSON.ressource7Titre,
                        description: ressourcesJSON.ressource7Description,
                        icone: UserRound,
                        href: "/ressources/trombinoscope",
                        disponible: true,
                    },
                ]
                : []),
            {
                id: "lexique-coureur",
                titre: ressourcesJSON.ressource2Titre,
                description: ressourcesJSON.ressource2Description,
                icone: BookOpen,
                href: "/ressources/lexique",
                disponible: true,
            },
            {
                id: "guide-debutant",
                titre: ressourcesJSON.ressource1Titre,
                description: ressourcesJSON.ressource1Description,
                icone: BookOpen,
                href: "/ressources/guide-debutant",
                disponible: false,
            },

            // --- 2. ENTRAÎNEMENT & ATHLÉTISME ---
            {
                id: "plan-entrainement",
                titre: ressourcesJSON.ressource3Titre,
                description: ressourcesJSON.ressource3Description,
                icone: RouteIcon,
                href: "/ressources/plan-entrainement",
                disponible: true,
            },
            {
                id: "vma",
                titre: ressourcesJSON.ressource4Titre,
                description: ressourcesJSON.ressource4Description,
                icone: Gauge,
                href: "/ressources/vma",
                disponible: true,
            },
            {
                id: "tests-vma",
                titre: ressourcesJSON.ressource5Titre,
                description: ressourcesJSON.ressource5Description,
                icone: SportShoe,
                href: "/ressources/tests-vma",
                disponible: true,
            },

            // --- 3. SANTÉ & HYGIÈNE DE VIE ---
            ...(estAuth
                ? [
                    {
                        id: "specialistes-sante",
                        titre: ressourcesJSON.ressource8Titre,
                        description: ressourcesJSON.ressource8Description,
                        icone: Stethoscope,
                        href: "/ressources/specialistes-sante",
                        disponible: true,
                    },
                ]
                : []),
            {
                id: "nutrition",
                titre: ressourcesJSON.ressource6Titre,
                description: ressourcesJSON.ressource6Description,
                icone: Salad,
                href: "/ressources/nutrition",
                disponible: false,
            },
        ];
    }, [ressourcesJSON]);



    return (
        <>
            <SEO
                titre="Guides & Ressources d'Entraînement Running — Running Vincennes Association"
                description="Accédez à nos outils gratuits pour coureurs : calculatrices de VMA, plans d'entraînement marathon/10km, tests physiques et lexique de la course à pied"
                chemin="/ressources"
            />

            <div className="mx-auto max-w-5xl px-6 py-12">
                {/* En-tête */}
                <header className="mb-10 max-w-2xl">
                    <h1 className="font-display text-3xl font-bold text-[#040F33] sm:text-4xl">{ressourcesJSON.titre}</h1>
                    <p className="mt-2 text-[#0B2270]/70">{ressourcesJSON.description}</p>
                </header>

                {/* Menu de ressources */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {RESSOURCES.map((r) => {
                        const Icone = r.icone;
                        const contenuCarte = (
                            <>
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-club-100 text-club-600 transition group-hover:bg-club-600 group-hover:text-white">
                                    <Icone size={20} />
                                </div>
                                <h2 className="mt-4 font-display text-base font-semibold text-[#040F33]">{r.titre}</h2>
                                <p className="mt-1.5 text-sm text-[#0B2270]/70">{r.description}</p>
                                {r.disponible ? (
                                    <span className="mt-4 flex items-center gap-1 text-sm font-medium text-club-600 transition group-hover:gap-2">
                                        Découvrir
                                        <ArrowRight size={14} />
                                    </span>
                                ) : (
                                    <span className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#0B2270]/40">
                                        <Clock size={12} />
                                        Bientôt disponible
                                    </span>
                                )}
                            </>
                        );

                        return r.disponible ? (

                            <Link
                                onClick={() => setChargement(r.id)}
                                key={r.id}
                                to={r.href}
                                className="group flex flex-col rounded-xl border border-club-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-club-300 hover:shadow-md"
                            >
                                {chargement == r.id ?
                                    <Loader2 size={16} className="animate-spin mx-auto my-auto" />
                                    : contenuCarte
                                }

                            </Link>

                        ) : (
                            <div key={r.id} className="group flex flex-col rounded-xl border border-dashed border-club-200 bg-club-50/40 p-5 opacity-70">
                                {contenuCarte}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}