/**
 * Page : ressources en ligne.
 * Organisée en catégories pour plus de lisibilité.
 *
 * Prérequis :
 * 1. lucide-react + react-router-dom.
 * 2. Adapter `href` de chaque ressource à la vraie route une fois la sous-page créée.
 * 3. Route suggérée : /ressources
 */

import { Link } from "react-router-dom";
import {
    Dumbbell,
    Route as RouteIcon,
    Gauge,
    BookOpen,
    Salad,
    ArrowRight,
    Clock,
    Footprints,
    Loader2,
    UserRound,
    Stethoscope,
    Cake,
    Trophy,
} from "lucide-react";

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

type Categorie = {
    id: string;
    titre: string;
    ressources: Ressource[];
};

const DONNEES_PAR_DEFAULT = {
    titre: "Ressources en ligne",
    description: "Des outils et des ressources pour progresser à votre rythme, compléter les séances du club et faciliter la vie de l'association.",

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
    ressource8Description: "Retrouvez les spécialistes de santé recommandés par les adhérents pour accompagner votre pratique de la course à pied.",

    ressource9Titre: "Anniversaires",
    ressource9Description: "Retrouvez les anniversaires des membres du club.",

    ressource10Titre: "Catégories FFA",
    ressource10Description: "Retrouvez votre catégorie FFA."
};

export default function NosRessources() {
    const [ressourcesJSON, setRessourcesJSON] = useState<any>(DONNEES_PAR_DEFAULT);
    const [chargement, setChargement] = useState<string | null>(null);

    const requeteJSON = useRequeteJSON();
    const { estAuth } = useAuth();

    useEffect(() => {
        async function recuperation() {
            const donnees = await requeteJSON("ressources", (nouvellesDonnees) => {
                if (nouvellesDonnees) setRessourcesJSON(nouvellesDonnees);
            });
            if (donnees) setRessourcesJSON(donnees);
        }
        recuperation();
    }, []);

    const CATEGORIES: Categorie[] = useMemo(() => {
        const categories: Categorie[] = [
            {
                id: "demarrer",
                titre: "Bien démarrer",
                ressources: [
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
                ],
            },
            {
                id: "entrainement",
                titre: "Entraînement & performance",
                ressources: [
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
                        icone: Footprints,
                        href: "/ressources/tests-vma",
                        disponible: true,
                    },
                    {
                        id: "categories-ffa",
                        titre: ressourcesJSON.ressource10Titre,
                        description: ressourcesJSON.ressource10Description,
                        icone: Trophy,
                        href: "/ressources/categories-ffa",
                        disponible: true,
                    },
                ],
            },
            {
                id: "sante",
                titre: "Santé & nutrition",
                ressources: [
                    {
                        id: "nutrition",
                        titre: ressourcesJSON.ressource6Titre,
                        description: ressourcesJSON.ressource6Description,
                        icone: Salad,
                        href: "/ressources/nutrition",
                        disponible: false,
                    },
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
                ],
            },
            {
                id: "vie-asso",
                titre: "Vie de l'association",
                ressources: [
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
                            {
                                id: "anniversaires",
                                titre: ressourcesJSON.ressource9Titre,
                                description: ressourcesJSON.ressource9Description,
                                icone: Cake,
                                href: "/ressources/anniversaires",
                                disponible: true,
                            },
                        ]
                        : []),
                ],
            },
        ];

        // On ne garde que les catégories qui ont au moins une ressource
        // (évite d'afficher "Vie de l'association" vide pour un visiteur non connecté)
        return categories.filter((cat) => cat.ressources.length > 0);
    }, [ressourcesJSON, estAuth]);

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

                {/* Catégories de ressources */}
                <div className="space-y-12">
                    {CATEGORIES.map((categorie) => (
                        <section key={categorie.id}>
                            <h2 className="mb-4 font-display text-lg font-semibold text-[#040F33] border-b border-club-100 pb-2">
                                {categorie.titre}
                            </h2>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {categorie.ressources.map((r) => {
                                    const Icone = r.icone;
                                    const contenuCarte = (
                                        <>
                                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-club-100 text-club-600 transition group-hover:bg-club-600 group-hover:text-white">
                                                <Icone size={20} />
                                            </div>
                                            <h3 className="mt-4 font-display text-base font-semibold text-[#040F33]">{r.titre}</h3>
                                            <p className="mt-1.5 text-sm text-[#0B2270]">{r.description}</p>
                                            {r.disponible ? (
                                                <span className="mt-4 flex items-center gap-1 text-sm font-medium text-club-600 transition group-hover:gap-2">
                                                    Découvrir
                                                    <ArrowRight size={14} />
                                                </span>
                                            ) : (
                                                <span className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#0B2270]">
                                                    <Clock size={12} className="text-[#0B2270]/60" />
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
                                            {chargement === r.id ? (
                                                <Loader2 size={16} className="animate-spin mx-auto my-auto" />
                                            ) : (
                                                contenuCarte
                                            )}
                                        </Link>
                                    ) : (
                                        <div
                                            key={r.id}
                                            className="group flex cursor-not-allowed flex-col rounded-xl border border-dashed border-club-200 bg-club-50/40 p-5"
                                        >
                                            {contenuCarte}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </>
    );
}