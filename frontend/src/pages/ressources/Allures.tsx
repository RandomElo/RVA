/**
 * Calculateur d'allures à partir de la VMA.
 *
 * Pour chaque distance, on propose 3-4 temps cibles selon le pourcentage de VMA
 * qu'il est réaliste de tenir sur cette distance (heuristique d'entraînement
 * classique : plus la distance est longue, plus le %VMA soutenable est bas).
 *
 * Ces pourcentages sont des repères indicatifs, pas une vérité absolue —
 * ils varient selon le profil du coureur (endurance vs vitesse pure).
 */

import { useEffect, useMemo, useState } from "react";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import SEO from "../../composants/generale/SEO";
import { bloqueurToucheInvalide, nettoyerNombre } from "../../fonctions/nettoyeurNombre";
type NiveauId = "prudent" | "objectif" | "ambitieux" | "record";

interface Niveau {
    id: NiveauId;
    label: string;
    description: string;
    delta: number; // points de %VMA ajoutés au pourcentage de base de la distance
    carte: string; // classes de la carte de niveau
    pastille: string; // classes de la pastille % VMA
}

// Écart resserré entre niveaux : les versions précédentes (delta -5/0/+3/+6)
// donnaient des écarts trop larges et des temps "Objectif" trop lents par
// rapport à ce qu'on peut réellement tenir sur 5 km / 10 km.

interface Distance {
    nom: string;
    km: number;
    // % de la VMA raisonnablement soutenable sur cette distance (niveau "objectif")
    pourcentageVMA: number;
}

const DONNEES_PAR_DEFAULT = {
    titre: "Calculateur d'allures",
    description: "Renseigne ta VMA pour obtenir, pour chaque distance, plusieurs temps cibles selon le niveau d'ambition : un repère prudent, un objectif cohérent, et des scénarios plus ambitieux.",

    palier1Titre: "Accessible",
    palier1Description: "Une base solide, sans forcer",
    palier2Titre: "Réaliste",
    palier2Description: "Cohérent avec ta VMA actuelle",
    palier3Titre: "Ambitieux",
    palier3Description: "Demande une bonne préparation spécifique",
    palier4Titre: "Excellent jour",
    palier4Description: "Le jour où tout est parfait",
    paragrapheAvertissement: "Les % de VMA utilisés par distance sont des repères d'entraînement usuels, pas une formule scientifique exacte — ils varient selon le profil du coureur (plus \"vitesse\" ou plus \"endurance\")."
}


// Table recalibrée : les anciens pourcentages étaient trop bas de 1 à 2 points
// sur les distances courtes/moyennes, ce qui donnait des temps "Objectif"
// nettement plus lents que ce qu'un coureur à cette VMA tient réellement
// (ex : 5 km à 88% → 17'51" au lieu de ~17'30" à 90%).
const DISTANCES: Distance[] = [
    { nom: "1000 m", km: 1, pourcentageVMA: 100 },
    { nom: "1500 m", km: 1.5, pourcentageVMA: 98 },
    { nom: "2000 m", km: 2, pourcentageVMA: 96 },
    { nom: "3000 m", km: 3, pourcentageVMA: 94 },
    { nom: "5000 m", km: 5, pourcentageVMA: 90 },
    { nom: "10 km", km: 10, pourcentageVMA: 86 },
    { nom: "15 km", km: 15, pourcentageVMA: 84 },
    { nom: "20 km", km: 20, pourcentageVMA: 82 },
    { nom: "Semi", km: 21.097, pourcentageVMA: 81 },
    { nom: "30 km", km: 30, pourcentageVMA: 79 },
    { nom: "Marathon", km: 42.195, pourcentageVMA: 76 },
    { nom: "50 km", km: 50, pourcentageVMA: 71 },
    { nom: "100 km", km: 100, pourcentageVMA: 61 },
];

// Distances affichées par défaut à l'ouverture de la page.
const DISTANCES_PAR_DEFAUT = ["10 km", "Semi", "Marathon"];

function vitesseVersAllure(vitesse: number) {
    if (!vitesse || vitesse <= 0) return "-";
    const secondes = Math.round((60 / vitesse) * 60);
    const min = Math.floor(secondes / 60);
    const sec = secondes % 60;
    return `${min}'${sec.toString().padStart(2, "0")}"`;
}

function formatTemps(secondes: number) {
    if (!secondes || secondes <= 0 || !Number.isFinite(secondes)) return "-";
    const h = Math.floor(secondes / 3600);
    const m = Math.floor((secondes % 3600) / 60);
    const s = Math.round(secondes % 60);

    if (h > 0) {
        return `${h}h${m.toString().padStart(2, "0")}'${s.toString().padStart(2, "0")}"`;
    }
    return `${m}'${s.toString().padStart(2, "0")}"`;
}

export default function CalculateurVMA() {
    const [vma, setVma] = useState<string>("19.1");
    const [distancesSelectionnees, setDistancesSelectionnees] = useState<Set<string>>(new Set(DISTANCES_PAR_DEFAUT));
    const [vmaJSON, setVmaJSON] = useState(DONNEES_PAR_DEFAULT)
    const requeteJSON = useRequeteJSON()

    const toggleDistance = (nom: string) => {
        setDistancesSelectionnees((prev) => {
            const next = new Set(prev);
            if (next.has(nom)) {
                next.delete(nom);
            } else {
                next.add(nom);
            }
            return next;
        });
    };

    const distancesAffichees = useMemo(() => DISTANCES.filter((d) => distancesSelectionnees.has(d.nom)), [distancesSelectionnees]);
    const vmaNum = parseFloat(vma) || 0;

    const NIVEAUX: Niveau[] = useMemo(() => {
        if (!vmaJSON) return [];

        return [
            {
                id: "prudent",
                label: vmaJSON.palier1Titre,
                description: vmaJSON.palier1Description,
                delta: -4,
                carte: "border border-club-200 bg-club-50",
                pastille: "bg-white text-club-600",
            },
            {
                id: "objectif",
                label: vmaJSON.palier2Titre,
                description: vmaJSON.palier2Description,
                delta: 0,
                carte: "border-2 border-club-600 bg-club-600",
                pastille: "bg-white text-club-600",
            },
            {
                id: "ambitieux",
                label: vmaJSON.palier3Titre,
                description: vmaJSON.palier3Description,
                delta: 2,
                carte: "border border-accent-500/40 bg-accent-500/10",
                pastille: "bg-white text-accent-700",
            },
            {
                id: "record",
                label: vmaJSON.palier4Titre,
                description: vmaJSON.palier4Description,
                delta: 4,
                carte: "border border-accent-500 bg-accent-500",
                pastille: "bg-white text-accent-700",
            },
        ];
    }, [vmaJSON]);

    const objectifsParDistance = useMemo(() => {
        return distancesAffichees.map((distance) => {
            const objectifs = NIVEAUX.map((niveau) => {
                const pourcentage = Math.min(103, Math.max(50, distance.pourcentageVMA + niveau.delta));
                const vitesse = (vmaNum * pourcentage) / 100;
                const secondes = (distance.km / vitesse) * 3600;
                return {
                    niveau,
                    pourcentage,
                    allure: vitesseVersAllure(vitesse),
                    temps: formatTemps(secondes),
                };
            });
            return { distance, objectifs };
        });
    }, [vmaNum, distancesAffichees, NIVEAUX]);



    useEffect(() => {
        async function recuperation() {
            const donnees = await requeteJSON("ressources/vma", (nouvellesDonnees) => {
                if (nouvellesDonnees) setVmaJSON(nouvellesDonnees)
            })
            if (donnees) setVmaJSON(donnees)
        }
        recuperation()
    }, []);

    return (
        <>
            <SEO
                titre="Calculateur d'allures de course selon la VMA — Running Vincennes Association"
                description="Calculez facilement votre VMA (Vitesse Maximale Aérobie) et vos temps de passage théoriques du 5km au marathon grâce à notre outil interactif."
                chemin="/ressources/vma"
            />
            <div className="font-body text-club-900 mx-auto max-w-6xl px-6 py-12">
                <header className="h-[97.5px]">
                    <h1 className="mt-1 font-display text-3xl font-bold text-club-600 md:text-4xl">{vmaJSON.titre}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-club-900/75">{vmaJSON.description}</p>
                </header>

                {/* VMA input */}
                <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-club-100 bg-club-50 p-6">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setVma((v) => Math.max(5, Number(((parseFloat(v) || 0) - 0.1).toFixed(1))).toString())}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-club-200 bg-white text-club-600 transition hover:bg-club-100"
                            aria-label="Diminuer la VMA"
                        >
                            −
                        </button>
                        <input
                            id="vma"
                            type="text"
                            inputMode="decimal"
                            onKeyDown={bloqueurToucheInvalide}
                            value={vma}
                            onChange={(e) => setVma(nettoyerNombre(e.target.value))}
                            className="w-24 rounded-lg border border-club-200 bg-white px-3 py-2 text-center font-semibold text-club-700 outline-none focus:border-club-600"
                        />
                        <span className="text-sm text-club-400">km/h</span>
                        <button
                            type="button"
                            onClick={() => setVma((v) => Math.min(30, Number(((parseFloat(v) || 0) + 0.1).toFixed(1))).toString())}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-club-200 bg-white text-club-600 transition hover:bg-club-100"
                            aria-label="Augmenter la VMA"
                        >
                            +
                        </button>
                    </div>
                    <span className="text-sm text-club-400">
                        soit une allure de <span className="font-semibold text-club-700">{vitesseVersAllure(vmaNum)}/km</span> au 100% de ta VMA
                    </span>
                </div>

                {/* Sélection des distances */}
                <div className="mt-6 h-auto rounded-2xl border border-club-100 bg-white p-5 sm:h-[151.5px]">
                    <p className="font-display text-sm font-semibold text-club-700">Distances à afficher</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {DISTANCES.map((distance) => {
                            const selectionnee = distancesSelectionnees.has(distance.nom);
                            return (
                                <button
                                    key={distance.nom}
                                    type="button"
                                    onClick={() => toggleDistance(distance.nom)}
                                    aria-pressed={selectionnee}
                                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${selectionnee ? "border-club-600 bg-club-600 text-white" : "border-club-200 bg-white text-club-600 hover:bg-club-50"}`}
                                >
                                    {distance.nom}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Légende des niveaux */}
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {NIVEAUX.map((niveau) => (
                        <div key={niveau.id} className="rounded-lg border border-club-100 bg-white px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${niveau.id === "objectif" || niveau.id === "record" ? "bg-club-600 text-white" : "bg-club-50 text-club-700"} ${niveau.id === "record" ? "bg-accent-500" : ""}`}>{niveau.label}</span>
                            <p className="mt-2 text-xs leading-snug text-club-900/70">{niveau.description}</p>
                        </div>
                    ))}
                </div>

                {/* Cartes par distance */}
                {distancesAffichees.length === 0 ? (
                    <p className="mt-8 rounded-xl border border-dashed border-club-200 bg-club-50 px-5 py-6 text-center text-sm text-club-400">Sélectionne au moins une distance ci-dessus pour afficher les allures.</p>
                ) : (
                    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {objectifsParDistance.map(({ distance, objectifs }) => (
                            <div key={distance.nom} className="overflow-hidden rounded-xl border border-club-100 bg-white">
                                <div className="bg-club-50 px-5 py-3">
                                    <h2 className="font-display text-base font-semibold text-club-700">{distance.nom}</h2>
                                </div>
                                <div className="flex flex-col gap-2 p-4">
                                    {objectifs.map(({ niveau, pourcentage, allure, temps }) => (
                                        <div key={niveau.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${niveau.carte}`}>
                                            <div>
                                                <p className={`text-xs font-semibold ${niveau.id === "objectif" || niveau.id === "record" ? "text-white" : "text-club-700"}`}>{niveau.label}</p>
                                                <p className={`text-[11px] ${niveau.id === "objectif" || niveau.id === "record" ? "text-white/80" : "text-club-400"}`}>
                                                    {pourcentage.toFixed(0)}% VMA · {allure}/km
                                                </p>
                                            </div>
                                            <span className={`font-display text-lg font-bold ${niveau.id === "objectif" || niveau.id === "record" ? "text-white" : "text-club-700"}`}>{temps}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <p className="mt-6 text-xs text-club-400">{vmaJSON.paragrapheAvertissement}</p>
            </div>
        </>

    );
}