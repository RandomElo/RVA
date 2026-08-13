/**
 * Page "Comprendre et tester sa VMA".
 *
 * 3 parties :
 *  1. À quoi sert un test de VMA + répartition des allures par zone (avec calcul live).
 *  2. Le test VAMEVAL, son protocole, et un tableau distance parcourue → VMA
 *     (données officielles Cazorla & Léger — paliers de 1 min, +0,5 km/h, départ à 8 km/h),
 *     avec un outil de recherche interactif.
 *  3. Le test Daniel Mercier (3-3) : protocole et principe (paragraphe explicatif).
 *
 * Mêmes conventions que le reste du projet : tokens club-* / accent-*, font-display / font-body.
 * 100% client-side.
 */

import { useEffect, useMemo, useState } from "react";
import { contenuPropre } from "../../fonctions/sanitizeur";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import SEO from "../../composants/generale/SEO";
import { bloqueurToucheInvalide, bloqueurToucheInvalideEntier, nettoyerEntier, nettoyerNombre } from "../../fonctions/nettoyeurNombre";

const DONNEES_PAR_DEFAULT = {
    titre: "Comprendre et tester sa VMA",
    intro: "Pourquoi tester sa vitesse maximale aérobie, comment lire les zones d'allure qui en découlent, et deux protocoles de terrain pour la mesurer : le VAMEVAL et le test Daniel Mercier.",

    titreAQuoiSertTestVMA: "À quoi sert un test de VMA ?",
    paragraphe1AQuoiSertTestVMA: "La <b>VMA</b> (vitesse maximale aérobie) est la vitesse de course à laquelle votre corps consomme le maximum d'oxygène qu'il est capable d'utiliser (VO2max). C'est la vitesse de référence à partir de laquelle on construit toutes les allures d'entraînement — un peu comme la FTP en cyclisme.",
    paragraphe2AQuoiSertTestVMA: "La tester régulièrement permet trois choses : <b>caler précisément les allures de chaque type de séance</b> (footing, seuil, fractionné) plutôt que de les estimer au ressenti, <b>suivre sa progression</b> dans la saison pour ajuster les plans d'entraînement, et <b>fixer des allures de course réalistes</b> sur 5 km, 10 km, semi ou marathon.",
    paragraphe3AQuoiSertTestVMA: "Une fois la VMA connue, chaque zone d'entraînement se définit comme un pourcentage de cette vitesse :",

    titreZone1TableauAllure: "Endurance fondamentale (EF)",
    descriptionZone1TableauAllure: "Allure de footing, respiration facile, on peut parler.",
    ceQueCaTravailleZone1TableauAllure: "Base du volume hebdomadaire, récupération active.",

    titreZone2TableauAllure: "Seuil (tempo)",
    descriptionZone2TableauAllure: "Effort soutenu mais tenu longtemps, à la limite du « confortable ».",
    ceQueCaTravailleZone2TableauAllure: "Développe la capacité à maintenir une allure élevée sans s'effondrer.",

    titreZone3TableauAllure: "Fractionné long (400–1000 m)",
    descriptionZone3TableauAllure: "Effort proche du maximum aérobie, sur des répétitions de plusieurs minutes.",
    ceQueCaTravailleZone3TableauAllure: "Développe le temps de soutien à VMA.",

    titreZone4TableauAllure: "Fractionné court (200–400 m)",
    descriptionZone4TableauAllure: "Allure au-dessus de la VMA, répétitions courtes.",
    ceQueCaTravailleZone4TableauAllure: "Développe la VMA elle-même et la puissance aérobie.",

    alluresCourse: "L'allure spécifique de course (celle visée le jour J) vient s'ajouter à ces zones : environ 95–98% VMA pour un 5 km, 90–93% pour un 10 km, 85–88% pour un semi, 78–82% pour un marathon.",

    titreTestVameval: "Le test VAMEVAL",
    paragraphe1TestVameval: "Créé par Georges Cazorla, le VAMEVAL est un test progressif et continu réalisé sur une piste (200 m ou un tour balisé, multiple de 20 m). Un signal sonore impose l'allure : on démarre à <b>8 km/h</b>, et la vitesse augmente de <b>0,5 km/h toutes les minutes</b>. Le coureur doit passer à chaque plot au moment du bip ; le test s'arrête dès qu'il ne parvient plus à suivre le rythme sur deux bips consécutifs.",
    paragraphe2TestVameval: "La <b>VMA correspond à la vitesse du dernier palier complété</b>. C'est un test progressif, donc moins traumatisant qu'un test « à fond » type Cooper, et reproductible plusieurs fois dans la saison pour suivre l'évolution du groupe.",

    titreTestDanielMercier: "Le test Daniel Mercier (3-3)",
    paragraphe1TestDanielMercier: "Le test Mercier 3-3 est une alternative au VAMEVAL : contrairement à un protocole continu, c'est un test <b>progressif et discontinu</b> qui alterne <b>3 minutes de course</b> à une allure imposée (avec une distance objectif à atteindre à chaque palier) et <b>3 minutes de récupération</b> active ou passive. À chaque palier, l'allure augmente, donc la distance à couvrir dans les 3 minutes devient de plus en plus exigeante. Le coureur passe au palier suivant après sa récupération, et le test s'arrête quand il ne parvient plus à tenir le repère de distance imposé.",
    paragraphe2TestDanielMercier: "La VMA se lit ensuite sur une table de correspondance propre au protocole (palier atteint, éventuellement affinée par la distance parcourue dans le dernier palier non terminé). <b>L'intérêt de ce format</b> : les pauses de 3 minutes rendent le chronométrage et le passage des plots plus faciles à gérer pour l'encadrant qu'un test continu, et elles permettent de surveiller la récupération cardiaque entre les efforts — un indicateur intéressant en plus de la VMA elle-même. En contrepartie, il <b>demande davantage d'organisation</b> (calcul des repères de distance pour chaque palier) et un balisage précis, une erreur de quelques mètres pouvant fausser le résultat. C'est un test plus volontiers utilisé en préparation physique de sports collectifs qu'en club d'endurance pure, mais il reste tout à fait exploitable pour évaluer un groupe si vous disposez du matériel (bande son et table de correspondance officielles du protocole)."

}

/* ============================== ALLURES ============================== */

interface Zone {
    label: string;
    pct: [number, number];
    desc: string;
    usage: string;
}

function paceFromPct(vma: number, pct: number) {
    const speed = vma * pct;
    const paceMin = 60 / speed;
    let m = Math.floor(paceMin);
    let s = Math.round((paceMin - m) * 60);
    if (s === 60) {
        m += 1;
        s = 0;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
}
function paceRange(vma: number, pctMin: number, pctMax: number) {
    return `${paceFromPct(vma, pctMax)} – ${paceFromPct(vma, pctMin)} /km`;
}

/* ============================== VAMEVAL ============================== */
// Source : "Comment évaluer et développer vos capacités aérobies" — Cazorla & Léger.
// Palier de 1 min, vitesse de départ 8 km/h, +0,5 km/h par palier.
const VAMEVAL_TABLE = [
    { palier: 1, vitesse: 8.0, distance: 133 },
    { palier: 2, vitesse: 8.5, distance: 275 },
    { palier: 3, vitesse: 9.0, distance: 425 },
    { palier: 4, vitesse: 9.5, distance: 583 },
    { palier: 5, vitesse: 10.0, distance: 750 },
    { palier: 6, vitesse: 10.5, distance: 925 },
    { palier: 7, vitesse: 11.0, distance: 1108 },
    { palier: 8, vitesse: 11.5, distance: 1300 },
    { palier: 9, vitesse: 12.0, distance: 1500 },
    { palier: 10, vitesse: 12.5, distance: 1708 },
    { palier: 11, vitesse: 13.0, distance: 1925 },
    { palier: 12, vitesse: 13.5, distance: 2150 },
    { palier: 13, vitesse: 14.0, distance: 2383 },
    { palier: 14, vitesse: 14.5, distance: 2625 },
    { palier: 15, vitesse: 15.0, distance: 2875 },
    { palier: 16, vitesse: 15.5, distance: 3133 },
    { palier: 17, vitesse: 16.0, distance: 3400 },
    { palier: 18, vitesse: 16.5, distance: 3675 },
    { palier: 19, vitesse: 17.0, distance: 3958 },
    { palier: 20, vitesse: 17.5, distance: 4250 },
    { palier: 21, vitesse: 18.0, distance: 4550 },
    { palier: 22, vitesse: 18.5, distance: 4858 },
    { palier: 23, vitesse: 19.0, distance: 5175 },
    { palier: 24, vitesse: 19.5, distance: 5500 },
    { palier: 25, vitesse: 20.0, distance: 5833 },
    { palier: 26, vitesse: 20.5, distance: 6175 },
    { palier: 27, vitesse: 21.0, distance: 6525 },
    { palier: 28, vitesse: 21.5, distance: 6883 },
    { palier: 29, vitesse: 22.0, distance: 7250 },
    { palier: 30, vitesse: 22.5, distance: 7625 },
    { palier: 31, vitesse: 23.0, distance: 8008 },
    { palier: 32, vitesse: 23.5, distance: 8400 },
    { palier: 33, vitesse: 24.0, distance: 8800 },
    { palier: 34, vitesse: 24.5, distance: 9208 },
    { palier: 35, vitesse: 25.0, distance: 9625 },
];

function lookupVameval(distanceM: number) {
    if (distanceM <= 0) return null;
    let last = VAMEVAL_TABLE[0];
    for (const row of VAMEVAL_TABLE) {
        if (row.distance <= distanceM) last = row;
        else break;
    }
    const next = VAMEVAL_TABLE.find((r) => r.palier === last.palier + 1);
    return { vma: last.vitesse, palier: last.palier, next };
}

/* ============================== MERCIER 3-3 ============================== */
// Contrairement au VAMEVAL, il n'existe pas de table unique et officiellement
// publiée pour le Mercier 3-3 : les bandes son commerciales varient un peu selon
// l'éditeur (vitesse de départ, taille des paliers). La grille ci-dessous est
// calculée à partir du principe même du protocole : chaque palier dure 3 min,
// donc distance (m) = vitesse (km/h) × 3 min, départ à 8 km/h, +0,5 km/h/palier.
// À utiliser comme repère ; recaler sur la bande son/table réellement utilisée le jour du test.
const MERCIER_TABLE = Array.from({ length: 24 }, (_, i) => {
    const palier = i + 1;
    const vitesse = 8 + i * 0.5;
    const distance = Math.round(vitesse * 50); // vitesse (km/h) × 1000/60 × 3 min
    return { palier, vitesse, distance };
});

function lookupMercier(dernierPalierComplet: number) {
    const row = MERCIER_TABLE.find((r) => r.palier === dernierPalierComplet);
    if (!row) return null;
    const next = MERCIER_TABLE.find((r) => r.palier === dernierPalierComplet + 1);
    return { vma: row.vitesse, palier: row.palier, next };
}

// Affinement : distance parcourue dans le palier suivant, non terminé.
function refineMercier(dernierPalierComplet: number, distanceDansPalierSuivant: number) {
    const row = MERCIER_TABLE.find((r) => r.palier === dernierPalierComplet);
    const next = MERCIER_TABLE.find((r) => r.palier === dernierPalierComplet + 1);
    if (!row || !next || distanceDansPalierSuivant <= 0) return null;
    const fraction = Math.min(distanceDansPalierSuivant / next.distance, 1);
    return Math.round((row.vitesse + fraction * 0.5) * 10) / 10;
}

/* ============================== COMPOSANT ============================== */

export default function TestsVMA() {
    const [vmaExample, setVmaExample] = useState("15.5");
    const [distanceInput, setDistanceInput] = useState<string>("");
    const [dernierPalier, setDernierPalier] = useState<string>("");
    const [distancePalierSuivant, setDistancePalierSuivant] = useState<string>("");
    const [testsVMAJSON, setTestsVMAJSON] = useState<any>(DONNEES_PAR_DEFAULT)

    const requeteJSON = useRequeteJSON()

    useEffect(() => {

        async function recuperation() {
            const donnees = await requeteJSON("ressources/tests-vma", (nouvellesDonnees) => {
                if (nouvellesDonnees) {
                    setTestsVMAJSON(nouvellesDonnees)
                }

            })

            if (donnees) setTestsVMAJSON(donnees);
        }
        recuperation()
    }, []);

    const ZONES: Zone[] = useMemo(() => {
        if (!testsVMAJSON) return [];

        return [
            { label: testsVMAJSON.titreZone1TableauAllure, pct: [0.65, 0.75], desc: testsVMAJSON.descriptionZone1TableauAllure, usage: testsVMAJSON.ceQueCaTravailleZone1TableauAllure },
            { label: testsVMAJSON.titreZone2TableauAllure, pct: [0.85, 0.9], desc: testsVMAJSON.descriptionZone2TableauAllure, usage: testsVMAJSON.ceQueCaTravailleZone2TableauAllure },
            { label: testsVMAJSON.titreZone3TableauAllure, pct: [0.9, 0.95], desc: testsVMAJSON.descriptionZone3TableauAllure, usage: testsVMAJSON.ceQueCaTravailleZone3TableauAllure },
            { label: testsVMAJSON.titreZone4TableauAllure, pct: [1.0, 1.1], desc: testsVMAJSON.descriptionZone4TableauAllure, usage: testsVMAJSON.ceQueCaTravailleZone4TableauAllure },
        ];
    }, [testsVMAJSON]);

    const vamevalResult = useMemo(() => {
        const n = parseFloat(distanceInput);
        if (!n || n <= 0) return null;
        return lookupVameval(n);
    }, [distanceInput]);

    const mercierResult = useMemo(() => {
        const n = parseInt(dernierPalier, 10);
        if (!n || n <= 0) return null;
        return lookupMercier(n);
    }, [dernierPalier]);

    const mercierRefined = useMemo(() => {
        const palier = parseInt(dernierPalier, 10);
        const dist = parseFloat(distancePalierSuivant);
        if (!palier || palier <= 0 || !dist || dist <= 0) return null;
        return refineMercier(palier, dist);
    }, [dernierPalier, distancePalierSuivant]);

    return (
        <>
            <SEO
                titre="Protocoles de Test VMA (Vameval, Demi-Cooper) : calcul et explications — Running Vincennes Association"
                description="Comprendre et réaliser son test de VMA. Explications pas à pas du Vameval, Luc Léger et test Demi-Cooper pour mesurer votre potentiel physique."
                chemin="/ressources/tests-vma"
            />

            <div className="font-body text-club-900 conteneurPage">
                {/* HERO */}
                <section className="bg-club-600 py-14">
                    <div className="mx-auto max-w-6xl px-6">
                        <h1 className="font-display text-3xl font-bold text-white md:text-4xl">{testsVMAJSON.titre}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-club-100 md:text-base">{testsVMAJSON.intro}</p>
                    </div>
                </section>

                <div className="mx-auto max-w-6xl px-6 py-12">
                    {/* ============ PARTIE 1 ============ */}
                    <section>
                        <div className="flex items-baseline gap-3">
                            <h2 className="font-display text-2xl font-semibold text-club-600">{testsVMAJSON.titreAQuoiSertTestVMA}</h2>
                        </div>

                        <div className="mt-4 space-y-4 text-sm leading-relaxed text-club-900/85 md:text-base">
                            <p dangerouslySetInnerHTML={{ __html: contenuPropre(testsVMAJSON.paragraphe1AQuoiSertTestVMA) }}></p>
                            <p dangerouslySetInnerHTML={{ __html: contenuPropre(testsVMAJSON.paragraphe2AQuoiSertTestVMA) }}></p>
                            <p dangerouslySetInnerHTML={{ __html: contenuPropre(testsVMAJSON.paragraphe3AQuoiSertTestVMA) }}></p>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg bg-club-50 p-4">
                            <label className="text-xs font-semibold uppercase tracking-wide text-club-400">Voir un exemple pour une VMA de</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                onKeyDown={bloqueurToucheInvalide}
                                value={vmaExample}
                                onChange={(e) => setVmaExample(nettoyerNombre(e.target.value))}
                                className="w-24 rounded-md border border-club-200 px-2 py-1 text-sm font-semibold text-club-900 focus:border-club-600 focus:outline-none"
                            />
                            <span className="text-xs font-semibold uppercase tracking-wide text-club-400">km/h</span>
                        </div>

                        <div className="mt-4 overflow-hidden rounded-xl border border-club-100">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-club-600 text-white">
                                        <th className="px-4 py-3 font-display text-xs uppercase tracking-wide">Zone</th>
                                        <th className="px-4 py-3 font-display text-xs uppercase tracking-wide">% VMA</th>
                                        <th className="px-4 py-3 font-display text-xs uppercase tracking-wide">Allure ({vmaExample || 0} km/h)</th>
                                        <th className="hidden px-4 py-3 font-display text-xs uppercase tracking-wide sm:table-cell">Ce que ça travaille</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ZONES.map((z, i) => (
                                        <tr key={z.label} className={i % 2 === 0 ? "bg-white" : "bg-club-50"}>
                                            <td className="px-4 py-3 font-medium text-club-700">
                                                {z.label}
                                                <p className="mt-0.5 text-xs font-normal text-club-400">{z.desc}</p>
                                            </td>
                                            <td className="px-4 py-3 text-club-700">
                                                {Math.round(z.pct[0] * 100)}–{Math.round(z.pct[1] * 100)}%
                                            </td>
                                            <td className="px-4 py-3 font-display font-bold text-accent-500">{paceRange(parseFloat(vmaExample) || 0, z.pct[0], z.pct[1])}</td>
                                            <td className="hidden px-4 py-3 text-xs text-club-600 sm:table-cell">{z.usage}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-2 text-xs text-club-400">{testsVMAJSON.alluresCourse}</p>
                    </section>

                    {/* ============ PARTIE 2 ============ */}
                    <section className="mt-14">
                        <div className="flex items-baseline gap-3">
                            <h2 className="font-display text-2xl font-semibold text-club-600">{testsVMAJSON.titreTestVameval}</h2>
                        </div>

                        <div className="mt-4 space-y-4 text-sm leading-relaxed text-club-900/85 md:text-base">
                            <p dangerouslySetInnerHTML={{ __html: contenuPropre(testsVMAJSON.paragraphe1TestVameval) }}></p>
                            <p dangerouslySetInnerHTML={{ __html: contenuPropre(testsVMAJSON.paragraphe2TestVameval) }}></p>
                        </div>

                        <div className="mt-6 rounded-lg bg-club-50 p-4">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-400">Distance totale parcourue pendant le test (mètres)</label>
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    onKeyDown={bloqueurToucheInvalideEntier}
                                    placeholder="ex : 3400"
                                    value={distanceInput}
                                    onChange={(e) => setDistanceInput(nettoyerEntier(e.target.value))}
                                    className="w-40 rounded-md border border-club-200 px-3 py-2 text-sm font-semibold text-club-900 focus:border-club-600 focus:outline-none"
                                />
                                {vamevalResult && (
                                    <span className="text-sm text-club-700">
                                        → dernier palier complété : <b>{vamevalResult.palier}</b> — VMA estimée : <span className="font-display font-bold text-accent-500">{vamevalResult.vma} km/h</span>
                                        {vamevalResult.next && (
                                            <>
                                                {" "}
                                                (palier {vamevalResult.next.palier} atteint à {vamevalResult.next.distance} m)
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-club-400">Si l'arrêt a lieu en cours de palier, on peut affiner : VMA = vitesse du palier précédent + (temps tenu sur le palier ÷ 60) × 0,5.</p>
                        </div>

                        <div className="mt-4 max-h-96 overflow-y-auto overflow-x-hidden rounded-xl border border-club-100">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="sticky top-0">
                                    <tr className="bg-club-600 text-white">
                                        <th className="px-4 py-2 font-display text-xs uppercase tracking-wide">Palier</th>
                                        <th className="px-4 py-2 font-display text-xs uppercase tracking-wide">Vitesse (VMA)</th>
                                        <th className="px-4 py-2 font-display text-xs uppercase tracking-wide">Distance cumulée</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {VAMEVAL_TABLE.map((row, i) => (
                                        <tr key={row.palier} className={i % 2 === 0 ? "bg-white" : "bg-club-50"}>
                                            <td className="px-4 py-2 text-club-700">{row.palier}</td>
                                            <td className="px-4 py-2 font-medium text-club-700">{row.vitesse.toFixed(1)} km/h</td>
                                            <td className="px-4 py-2 text-club-600">{row.distance} m</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-2 text-xs text-club-400">Source : « Comment évaluer et développer vos capacités aérobies » — Cazorla &amp; Léger.</p>
                    </section>

                    {/* ============ PARTIE 3 ============ */}
                    <section className="mt-14 mb-4">
                        <div className="flex items-baseline gap-3">
                            <h2 className="font-display text-2xl font-semibold text-club-600">{testsVMAJSON.titreTestDanielMercier}</h2>
                        </div>

                        <div className="mt-4 space-y-4 text-sm leading-relaxed text-club-900/85 md:text-base">
                            <p dangerouslySetInnerHTML={{ __html: contenuPropre(testsVMAJSON.paragraphe1TestDanielMercier) }}></p>
                            <p dangerouslySetInnerHTML={{ __html: contenuPropre(testsVMAJSON.paragraphe2TestDanielMercier) }}></p>

                        </div>

                        <div className="mt-6 rounded-lg bg-club-50 p-4">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-400">Dernier palier complété avec succès</label>
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    onKeyDown={bloqueurToucheInvalideEntier}
                                    placeholder="ex : 14"
                                    value={dernierPalier}
                                    onChange={(e) => setDernierPalier(nettoyerEntier(e.target.value))}
                                    className="w-32 rounded-md border border-club-200 px-3 py-2 text-sm font-semibold text-club-900 focus:border-club-600 focus:outline-none"
                                />
                                {mercierResult && (
                                    <span className="text-sm text-club-700">
                                        → VMA estimée : <span className="font-display font-bold text-accent-500">{mercierResult.vma.toFixed(1)} km/h</span>
                                        {mercierResult.next && (
                                            <>
                                                {" "}
                                                (palier {mercierResult.next.palier} : objectif {mercierResult.next.distance} m en 3 min)
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>

                            {mercierResult?.next && (
                                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-club-200 pt-3">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-club-400">Distance parcourue dans le palier {mercierResult.next.palier} (non terminé, en m)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        onKeyDown={bloqueurToucheInvalideEntier}
                                        placeholder={`sur ${mercierResult.next.distance} m`}
                                        value={distancePalierSuivant}
                                        onChange={(e) => setDistancePalierSuivant(nettoyerEntier(e.target.value))}
                                        className="w-32 rounded-md border border-club-200 px-3 py-2 text-sm font-semibold text-club-900 focus:border-club-600 focus:outline-none"
                                    />
                                    {mercierRefined && (
                                        <span className="text-sm text-club-700">
                                            → VMA affinée : <span className="font-display font-bold text-accent-500">{mercierRefined} km/h</span>
                                        </span>
                                    )}
                                </div>
                            )}

                            <p className="mt-2 text-xs text-club-400">Affinement : VMA = vitesse du dernier palier complété + (distance parcourue dans le palier suivant ÷ distance objectif de ce palier) × 0,5.</p>
                        </div>

                        <div className="mt-4 max-h-96 overflow-y-auto overflow-x-hidden rounded-xl border border-club-100">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="sticky top-0">
                                    <tr className="bg-club-600 text-white">
                                        <th className="px-4 py-2 font-display text-xs uppercase tracking-wide">Palier</th>
                                        <th className="px-4 py-2 font-display text-xs uppercase tracking-wide">Vitesse (VMA)</th>
                                        <th className="px-4 py-2 font-display text-xs uppercase tracking-wide">Distance objectif (3 min)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MERCIER_TABLE.map((row, i) => (
                                        <tr key={row.palier} className={i % 2 === 0 ? "bg-white" : "bg-club-50"}>
                                            <td className="px-4 py-2 text-club-700">{row.palier}</td>
                                            <td className="px-4 py-2 font-medium text-club-700">{row.vitesse.toFixed(1)} km/h</td>
                                            <td className="px-4 py-2 text-club-600">{row.distance} m</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}