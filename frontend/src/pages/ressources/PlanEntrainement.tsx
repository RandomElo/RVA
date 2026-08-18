/**
 * Page "Générateur de plans d'entraînement".
 *
 * Calcule les allures de fractionné à partir de la VMA, plafonne à 2 séances
 * d'intensité par semaine, insère une semaine d'assimilation (volume réduit)
 * une semaine sur quatre, et affûte les 1 à 2 dernières semaines avant la course.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { contenuPropre } from "../../fonctions/sanitizeur";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import { Loader2, Download, Clipboard, Check } from "lucide-react";
import SEO from "../../composants/generale/SEO";
import { bloqueurToucheInvalide, bloqueurToucheInvalideEntier, nettoyerEntier, nettoyerNombre } from "../../fonctions/nettoyeurNombre";

/* ============================== TYPES ============================== */

type DistanceKey = "5km" | "10km" | "semi" | "marathon";
type SessionKind = "EF" | "LONGUE" | "SEUIL" | "FRAC_COURT" | "FRAC_LONG" | "ALLURE_SPE" | "RECUP" | "PPG";
type WeekType = "build" | "recovery" | "taper";

interface DistParams {
    label: string;
    defWeeks: number;
    longueBase: number;
    seuilBaseMin: number;
    efBaseMin: number;
    allureSpeBaseMin: number;
    fracCourt: { reps: number; dist: number };
    fracLong: { reps: number; dist: number };
    allureSpePct: [number, number];
}

interface Session {
    kind: SessionKind;
    label: string;
    desc: string;
    pace: string;
    vol: string;
    durationMin: number;
    distanceKm: number;
}

interface Week {
    num: number;
    type: WeekType;
    sessions: Session[];
}

/* ============================== DONNÉES DE BASE ============================== */
const DONNNEES_PAR_DEFAULT = {
    titre: "Générateur de plans d'entraînement",
    description: "Choisissez la distance, la VMA et le nombre de séances par semaine : les allures et volumes de chaque séance se calculent automatiquement, avec des semaines d'assimilation à volume réduit et un affûtage avant la course.",
    repereAllures: "<b>Repères d'allure :</b> EF = endurance fondamentale (65–75% VMA) · Seuil = tempo continu (85–90% VMA) · Fractionné long = 400–1000m (90–95% VMA) · Fractionné court = 200–400m (100–110% VMA) · Allure spécifique = allure visée le jour de la course. <b>Jamais plus de 2 séances d'intensité par semaine</b> (le reste est EF, récup active ou PPG). Une semaine sur quatre est allégée, et les 1 à 2 dernières semaines sont affûtées avant la course.",
    avertissement: "<b>⚠️ Ceci n'est pas un plan encadré par un coach.</b> Cet outil génère automatiquement des idées de séances à partir de formules génériques (VMA, distance, nombre de séances). Il ne remplace pas l'avis d'un entraîneur qui connaît votre historique, vos sensations et vos éventuelles blessures. Utilisez-le comme point de départ pour vous inspirer, pas comme une prescription à suivre à la lettre. En cas de douleur, de fatigue inhabituelle ou de doute, adaptez la séance ou consultez un professionnel (coach du club, médecin du sport).",
    philosophie: "<b>Notre philosophie d'entraînement :</b> progresser sans se blesser. Le plan suit la logique 80/20 : la grande majorité des séances se courent en endurance fondamentale, à allure confortable, et seules 1 à 2 séances par semaine sont réellement intenses (seuil ou fractionné). La charge monte progressivement, avec une semaine allégée tous les 4 semaines pour laisser le corps assimiler le travail, puis un affûtage en fin de préparation pour arriver reposé le jour de la course. La régularité et la récupération comptent souvent plus que l'intensité d'une séance isolée."
}
const CATEGORY_VMA: Record<string, number> = {
    "38": 18.5,
    "40": 17.5,
    "42": 16.5,
    "45": 15.5,
    "50": 14.5,
    "55": 13.5,
    "60": 12.5,
};

const DIST_PARAMS: Record<DistanceKey, DistParams> = {
    "5km": { label: "5 km", defWeeks: 8, longueBase: 10, seuilBaseMin: 18, efBaseMin: 38, allureSpeBaseMin: 14, fracCourt: { reps: 12, dist: 300 }, fracLong: { reps: 6, dist: 600 }, allureSpePct: [0.95, 0.98] },
    "10km": { label: "10 km", defWeeks: 10, longueBase: 14, seuilBaseMin: 25, efBaseMin: 45, allureSpeBaseMin: 20, fracCourt: { reps: 10, dist: 400 }, fracLong: { reps: 6, dist: 800 }, allureSpePct: [0.9, 0.93] },
    semi: { label: "Semi-marathon", defWeeks: 12, longueBase: 19, seuilBaseMin: 30, efBaseMin: 50, allureSpeBaseMin: 30, fracCourt: { reps: 10, dist: 400 }, fracLong: { reps: 5, dist: 1000 }, allureSpePct: [0.85, 0.88] },
    marathon: { label: "Marathon", defWeeks: 14, longueBase: 32, seuilBaseMin: 35, efBaseMin: 60, allureSpeBaseMin: 45, fracCourt: { reps: 8, dist: 400 }, fracLong: { reps: 5, dist: 1000 }, allureSpePct: [0.78, 0.82] },
};

const DIST_VOLUME_FACTOR: Record<DistanceKey, number> = { "5km": 0.75, "10km": 1.0, semi: 1.15, marathon: 1.35 };

const WARMUP_KM = 6;
const COOLDOWN_KM = 3;

const WEEK_TYPE_LABEL: Record<WeekType, string> = {
    build: "Semaine de développement",
    recovery: "Semaine d'assimilation",
    taper: "Semaine d'affûtage",
};
const WEEK_TYPE_TAG: Record<WeekType, string> = {
    build: "Charge normale",
    recovery: "Volume réduit ~-35%",
    taper: "Approche de la course",
};
const WEEK_TYPE_BAR: Record<WeekType, string> = {
    build: "bg-club-600",
    recovery: "bg-club-400",
    taper: "bg-accent-500",
};
const WEEK_TYPE_BADGE: Record<WeekType, string> = {
    build: "bg-club-50 text-club-700",
    recovery: "bg-club-100 text-club-700",
    taper: "bg-accent-50 text-accent-700",
};


/* ============================== CALCULS ============================== */

function speedFromPct(vma: number, pct: number) {
    return vma * pct;
}
function distKmForMin(min: number, vma: number, pct: number) {
    return speedFromPct(vma, pct) * (min / 60);
}
function minForKm(km: number, vma: number, pct: number) {
    return (km / speedFromPct(vma, pct)) * 60;
}
function roundTo(v: number, step: number) {
    return Math.round(v / step) * step;
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
    return `${paceFromPct(vma, pctMin)} → ${paceFromPct(vma, pctMax)} /km`;
}
function formatMin(min: number) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function buildSession(kind: SessionKind, vma: number, params: DistParams, factor: number): Session {
    switch (kind) {
        case "EF": {
            const dur = Math.max(25, roundTo(params.efBaseMin * factor, 5));
            return {
                kind,
                label: "Endurance fondamentale",
                desc: "Footing continu, aisance respiratoire, discussion possible.",
                pace: paceRange(vma, 0.65, 0.75),
                vol: `${dur} min`,
                durationMin: dur,
                distanceKm: distKmForMin(dur, vma, 0.7),
            };
        }
        case "LONGUE": {
            const km = Math.max(5, Math.round(params.longueBase * factor * 10) / 10);
            return {
                kind,
                label: "Sortie longue",
                desc: "Endurance, allure régulière, terrain roulant.",
                pace: paceRange(vma, 0.7, 0.75),
                vol: `${km} km`,
                durationMin: minForKm(km, vma, 0.725),
                distanceKm: km,
            };
        }
        case "SEUIL": {
            const dur = Math.max(10, roundTo(params.seuilBaseMin * factor, 5));
            const warmMin = minForKm(WARMUP_KM, vma, 0.65);
            const coolMin = minForKm(COOLDOWN_KM, vma, 0.6);
            return {
                kind,
                label: "Seuil (tempo)",
                desc: `Échauffement ${WARMUP_KM} km, effort continu soutenu mais tenable, puis récup ${COOLDOWN_KM} km.`,
                pace: paceRange(vma, 0.85, 0.9),
                vol: `${WARMUP_KM}km éch. + ${dur}min continu + ${COOLDOWN_KM}km récup`,
                durationMin: dur + warmMin + coolMin,
                distanceKm: distKmForMin(dur, vma, 0.875) + WARMUP_KM + COOLDOWN_KM,
            };
        }
        case "FRAC_COURT": {
            const reps = Math.max(4, Math.round(params.fracCourt.reps * factor));
            const runKm = (reps * params.fracCourt.dist) / 1000;
            const runMin = minForKm(runKm, vma, 1.05);
            const recupMin = reps * 1.25;
            const warmMin = minForKm(WARMUP_KM, vma, 0.65);
            const coolMin = minForKm(COOLDOWN_KM, vma, 0.6);
            return {
                kind,
                label: "Fractionné court",
                desc: `Échauffement ${WARMUP_KM} km, puis ${reps} × ${params.fracCourt.dist}m (récup trot 1' à 1'30 entre les fractions), puis récup ${COOLDOWN_KM} km.`,
                pace: paceRange(vma, 1.0, 1.1),
                vol: `${WARMUP_KM}km éch. + ${reps}×${params.fracCourt.dist}m + ${COOLDOWN_KM}km récup`,
                durationMin: runMin + recupMin + warmMin + coolMin,
                distanceKm: runKm + distKmForMin(recupMin, vma, 0.5) + WARMUP_KM + COOLDOWN_KM,
            };
        }
        case "FRAC_LONG": {
            const reps = Math.max(3, Math.round(params.fracLong.reps * factor));
            const runKm = (reps * params.fracLong.dist) / 1000;
            const runMin = minForKm(runKm, vma, 0.925);
            const recupMin = reps * 2.5;
            const warmMin = minForKm(WARMUP_KM, vma, 0.65);
            const coolMin = minForKm(COOLDOWN_KM, vma, 0.6);
            return {
                kind,
                label: "Fractionné long",
                desc: `Échauffement ${WARMUP_KM} km, puis ${reps} × ${params.fracLong.dist}m (récup trot 2' à 3' entre les fractions), puis récup ${COOLDOWN_KM} km.`,
                pace: paceRange(vma, 0.9, 0.95),
                vol: `${WARMUP_KM}km éch. + ${reps}×${params.fracLong.dist}m + ${COOLDOWN_KM}km récup`,
                durationMin: runMin + recupMin + warmMin + coolMin,
                distanceKm: runKm + distKmForMin(recupMin, vma, 0.5) + WARMUP_KM + COOLDOWN_KM,
            };
        }
        case "ALLURE_SPE": {
            const dur = Math.max(10, roundTo(params.allureSpeBaseMin * factor, 5));
            const [pmin, pmax] = params.allureSpePct;
            const pmid = (pmin + pmax) / 2;
            const warmMin = minForKm(WARMUP_KM, vma, 0.65);
            const coolMin = minForKm(COOLDOWN_KM, vma, 0.6);
            return {
                kind,
                label: "Allure spécifique",
                desc: `Échauffement ${WARMUP_KM} km, puis allure visée le jour de la course, puis récup ${COOLDOWN_KM} km.`,
                pace: paceRange(vma, pmin, pmax),
                vol: `${WARMUP_KM}km éch. + ${dur}min à allure objectif + ${COOLDOWN_KM}km récup`,
                durationMin: dur + warmMin + coolMin,
                distanceKm: distKmForMin(dur, vma, pmid) + WARMUP_KM + COOLDOWN_KM,
            };
        }
        case "RECUP": {
            const dur = Math.max(15, roundTo(20 * factor, 5));
            return {
                kind,
                label: "Footing récupération",
                desc: "Très facile, décrassage, aucune notion de performance.",
                pace: paceRange(vma, 0.55, 0.65),
                vol: `${dur} min`,
                durationMin: dur,
                distanceKm: distKmForMin(dur, vma, 0.6),
            };
        }
        case "PPG": {
            const dur = Math.max(20, roundTo(30 * factor, 5));
            return {
                kind,
                label: "PPG / renforcement",
                desc: "Gainage, proprioception, renforcement musculaire — pas de course.",
                pace: "—",
                vol: `${dur} min`,
                durationMin: dur,
                distanceKm: 0,
            };
        }
    }
}

function getSessionKinds(nbSeances: number, weekIndex: number, isLateBlock: boolean): SessionKind[] {
    const qualiteA: SessionKind = weekIndex % 2 === 0 ? "FRAC_COURT" : "FRAC_LONG";
    const qualiteB: SessionKind = isLateBlock ? "ALLURE_SPE" : "SEUIL";
    switch (nbSeances) {
        case 2:
            return [qualiteA, "LONGUE"];
        case 3:
            return [qualiteA, "EF", "LONGUE"];
        case 4:
            return [qualiteA, "EF", qualiteB, "LONGUE"];
        case 5:
            return [qualiteA, "EF", qualiteB, "EF", "LONGUE"];
        case 6:
            return [qualiteA, "EF", qualiteB, "PPG", "EF", "LONGUE"];
        default:
            return [qualiteA, "EF", "LONGUE"];
    }
}

function computeWeekPlanTypes(nbWeeks: number, distanceKey: DistanceKey): { type: WeekType; factor: number }[] {
    const taperWeeks = distanceKey === "marathon" || distanceKey === "semi" ? 2 : 1;
    const peakWeek = Math.max(1, nbWeeks - taperWeeks);
    const result: { type: WeekType; factor: number }[] = [];
    for (let i = 1; i <= nbWeeks; i++) {
        if (i > peakWeek) {
            const posInTaper = i - peakWeek;
            result.push({ type: "taper", factor: posInTaper === 1 ? 0.6 : 0.42 });
        } else if (i % 4 === 0) {
            result.push({ type: "recovery", factor: 0.62 });
        } else {
            const ramp = peakWeek > 1 ? (i - 1) / (peakWeek - 1) : 1;
            result.push({ type: "build", factor: Math.min(1, 0.7 + 0.3 * ramp) });
        }
    }
    return result;
}

function suggestPeakKm(vma: string, distanceKey: DistanceKey) {
    const vmaNumber = parseFloat(vma) || 0;
    const base = 6 * vmaNumber - 30; // calé sur un 10 km
    const factor = DIST_VOLUME_FACTOR[distanceKey] || 1;
    const raw = Math.max(20, base) * factor;
    return (Math.round(raw / 5) * 5).toString();
}

function computeBasePeakKm(params: DistParams, nbSeances: number, vma: number) {
    const kinds = getSessionKinds(nbSeances, 1, false);
    return kinds.reduce((total, k) => total + buildSession(k, vma, params, 1).distanceKm, 0);
}

function scaledParamsFor(distanceKey: DistanceKey, nbSeances: number, targetKm: number, vma: number): DistParams {
    const base = DIST_PARAMS[distanceKey];
    const basePeak = computeBasePeakKm(base, nbSeances, vma);
    let scale = basePeak > 0 ? targetKm / basePeak : 1;
    scale = Math.min(3, Math.max(0.4, scale));
    return {
        ...base,
        efBaseMin: base.efBaseMin * scale,
        longueBase: base.longueBase * scale,
        seuilBaseMin: base.seuilBaseMin * scale,
        allureSpeBaseMin: base.allureSpeBaseMin * scale,
        fracCourt: { ...base.fracCourt, reps: Math.max(4, Math.round(base.fracCourt.reps * scale)) },
        fracLong: { ...base.fracLong, reps: Math.max(3, Math.round(base.fracLong.reps * scale)) },
    };
}

function weekTotals(w: Week) {
    let km = 0,
        min = 0;
    w.sessions.forEach((s) => {
        km += s.distanceKm || 0;
        min += s.durationMin || 0;
    });
    return { km: Math.round(km * 10) / 10, durStr: formatMin(min) };
}

function generateWeeks(distanceKey: DistanceKey, vma: number, nbSeances: number, nbSemaines: number, targetKm: number): Week[] {
    const params = scaledParamsFor(distanceKey, nbSeances, targetKm, vma);
    const planTypes = computeWeekPlanTypes(nbSemaines, distanceKey);
    const lateBlockStart = nbSemaines - (distanceKey === "marathon" || distanceKey === "semi" ? 4 : 3);
    return planTypes.map((wt, idx) => {
        const weekIndex = idx + 1;
        const isLateBlock = weekIndex > lateBlockStart || wt.type === "taper";
        const kinds = getSessionKinds(nbSeances, weekIndex, isLateBlock);
        const sessions = kinds.map((k) => buildSession(k, vma, params, wt.factor));
        return { num: weekIndex, type: wt.type, sessions };
    });
}

/* ============================== COMPOSANT ============================== */

export default function PlanEntrainement() {
    const [distance, setDistance] = useState<DistanceKey>("10km");
    const [category, setCategory] = useState<string>("custom");
    const [vma, setVma] = useState<string>("15.5");
    const [seances, setSeances] = useState(3);
    const [nbSemaines, setNbSemaines] = useState<string>(DIST_PARAMS["10km"].defWeeks.toString());
    const [targetKm, setTargetKm] = useState<string>(() => suggestPeakKm("15.5", "10km"));
    const [targetKmManual, setTargetKmManual] = useState(false);
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [planEntrainementJSON, setPlanEntrainementJSON] = useState<any>(DONNNEES_PAR_DEFAULT);
    const [isExporting, setIsExporting] = useState(false);
    const [generationPlanTexte, setGenerationPlanTexte] = useState<boolean>(false);
    const [copieReussie, setCopieReussie] = useState(false);

    const planContainerRef = useRef<HTMLDivElement>(null);
    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        async function recuperation() {
            const donnees = await requeteJSON("ressources/plan-entrainement", (nouvellesDonnees) => {
                if (nouvellesDonnees) setPlanEntrainementJSON(nouvellesDonnees)
            });
            if (donnees) setPlanEntrainementJSON(donnees);
        }
        recuperation();
    }, []);

    // Suggestion de km hebdo, tant que l'entraîneur n'a pas tapé une valeur perso
    useEffect(() => {
        if (!targetKmManual) {
            setTargetKm(suggestPeakKm(vma, distance));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vma, distance, targetKmManual]);

    // Génère automatiquement un premier plan au chargement
    useEffect(() => {
        setWeeks(generateWeeks(distance, parseFloat(vma) || 0, seances, parseInt(nbSemaines, 10) || 1, parseFloat(targetKm) || 0));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const categoryHint = useMemo(() => {
        if (category === "custom") return "";
        const label = category === "60" ? "1h" : `0:${category}`;
        return `VMA estimée pour un 10 km en ${label} — ajustez si vous connaissez la VMA réelle.`;
    }, [category]);

    function handleCategoryChange(v: string) {
        setCategory(v);
        if (v !== "custom") setVma(CATEGORY_VMA[v].toString());
    }
    function handleDistanceChange(v: DistanceKey) {
        setDistance(v);
        setNbSemaines(DIST_PARAMS[v].defWeeks.toString());
    }
    function handleGenerate() {
        const numVma = parseFloat(vma) || 0;
        const numNbSemaines = parseInt(nbSemaines, 10) || 1;
        const numTargetKm = parseFloat(targetKm) || 0;
        setWeeks(generateWeeks(distance, numVma, seances, numNbSemaines, numTargetKm));
    }

    // Exportation sous forme d'image PNG via html2canvas
    async function handleExportImage() {
        if (!planContainerRef.current) return;
        setIsExporting(true);

        try {
            const canvas = await html2canvas(planContainerRef.current, {
                scale: 2, // Améliore la résolution
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `plan-entrainement-${distance}-${vma}vma.png`;
            link.click();
        } catch (error) {
            console.error("Erreur lors de la création de l'image :", error);
        } finally {
            setIsExporting(false);
        }
    }


    async function handleExportPlanTexte() {
        if (!weeks || weeks.length === 0) return;
        setGenerationPlanTexte(true);

        try {
            // En-tête du texte
            let textePlan = `=========================================\n`;
            textePlan += `PLAN D'ENTRAÎNEMENT - ${DIST_PARAMS[distance].label.toUpperCase()}\n`;
            textePlan += `Running Vincennes Association\n`;
            textePlan += `=========================================\n`;
            textePlan += `• VMA : ${vma} km/h\n`;
            textePlan += `• Durée : ${nbSemaines} semaines\n`;
            textePlan += `• Séances/semaine : ${seances}\n`;
            textePlan += `• Volume max visé : ~${targetKm} km/semaine\n`;
            textePlan += `=========================================\n\n`;

            // Parcours de chaque semaine
            weeks.forEach((w) => {
                const totals = weekTotals(w);
                textePlan += `--- SEMAINE ${w.num} (${WEEK_TYPE_LABEL[w.type].toUpperCase()}) ---\n`;
                textePlan += `Volume : ${totals.km} km | Durée estimée : ${totals.durStr}\n`;
                textePlan += `-----------------------------------------\n`;

                w.sessions.forEach((s, idx) => {
                    textePlan += `  [Séance ${idx + 1}] ${s.label}\n`;
                    textePlan += `  • Description : ${s.desc}\n`;
                    textePlan += `  • Allure : ${s.pace}\n`;
                    textePlan += `  • Volume : ${s.vol} (${formatMin(s.durationMin)})\n`;
                    textePlan += `\n`;
                });

                textePlan += `\n`;
            });

            // Copie dans le presse-papier
            await navigator.clipboard.writeText(textePlan);

            // Feedback visuel court
            setCopieReussie(true);
            setTimeout(() => setCopieReussie(false), 3000);
        } catch (error) {
            console.error("Erreur lors de la copie du plan en texte :", error);
            alert("Impossible de copier le plan automatiquement. Vérifiez les autorisations de votre navigateur.");
        } finally {
            setGenerationPlanTexte(false);
        }
    }

    return (
        <>
            <SEO
                titre="Générateur de plan d'entraînement running personnalisé — Running Vincennes Association"
                description="Téléchargez nos plans d’entraînement de course à pied adaptés à votre niveau, vos objectifs et vos contraintes. Préparez efficacement votre 10 km, semi-marathon ou marathon."
                chemin="/ressources/plan-entrainement"
            />

            <div className="font-body text-club-900 conteneurPage">
                {/* HERO */}
                <header className="bg-club-600 py-14 h-[242px]">
                    <div className="mx-auto max-w-6xl px-6">
                        <h1 className="font-display text-3xl font-bold text-white md:text-4xl">{planEntrainementJSON.titre}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-club-100 md:text-base">
                            {planEntrainementJSON.description}
                        </p>
                    </div>
                </header>

                {/* FORMULAIRE */}
                <section className="mx-auto max-w-6xl px-6 py-10">
                    <div className="rounded-xl border border-club-100 bg-white p-6 print:hidden">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-400">Objectif</label>
                                <select value={distance} onChange={(e) => handleDistanceChange(e.target.value as DistanceKey)} className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none">
                                    {(Object.keys(DIST_PARAMS) as DistanceKey[]).map((k) => (
                                        <option key={k} value={k}>
                                            {DIST_PARAMS[k].label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-400">Temps repère (10 km)</label>
                                <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none">
                                    <option value="custom">Selon VMA</option>
                                    <option value="38">Sub 38'</option>
                                    <option value="40">Sub 40'</option>
                                    <option value="42">Sub 42'</option>
                                    <option value="45">Sub 45'</option>
                                    <option value="50">Sub 50'</option>
                                    <option value="55">Sub 55'</option>
                                    <option value="60">Sub 1h</option>
                                </select>
                                <p className="mt-1 text-xs text-club-400">{categoryHint}</p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-400">VMA (km/h)</label>
                                <input
                                    type="number"
                                    step={0.1}
                                    min={8}
                                    max={24}
                                    value={vma}
                                    onKeyDown={bloqueurToucheInvalide}
                                    onChange={(e) => setVma(nettoyerNombre(e.target.value))}
                                    className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-400">Séances / semaine</label>
                                <select value={seances} onChange={(e) => setSeances(parseInt(e.target.value, 10))} className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none">
                                    {[2, 3, 4, 5, 6].map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-400">Nombre de semaines</label>
                                <input
                                    type="number"
                                    min={3}
                                    max={20}
                                    value={nbSemaines}
                                    onKeyDown={bloqueurToucheInvalideEntier}
                                    onChange={(e) => setNbSemaines(nettoyerEntier(e.target.value))}
                                    className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="flex items-end gap-1 mb-1">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-club-400">
                                        Km hebdo visé
                                    </span>
                                    <span className="text-[10px] text-club-400">
                                        (en pointe)
                                    </span>
                                </label>

                                <input
                                    type="number"
                                    min={15}
                                    max={220}
                                    value={targetKm}
                                    onKeyDown={bloqueurToucheInvalide}
                                    onChange={(e) => {
                                        setTargetKmManual(true);
                                        setTargetKm(nettoyerNombre(e.target.value));
                                    }}
                                    className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none"
                                />
                                <button type="button" onClick={() => setTargetKmManual(false)} className="mt-1 text-xs font-medium text-accent-500 hover:text-accent-700">
                                    ↺ recalculer la suggestion
                                </button>
                            </div>
                        </div>

                        <p className="mt-6 rounded-lg bg-club-50 p-4 text-xs leading-relaxed text-club-700" dangerouslySetInnerHTML={{ __html: contenuPropre(planEntrainementJSON.repereAllures) }}>
                        </p>


                        {/* AVERTISSEMENT — pas un coach */}
                        {planEntrainementJSON.avertissement && (
                            <p
                                className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"
                                dangerouslySetInnerHTML={{ __html: contenuPropre(planEntrainementJSON.avertissement) }}
                            />
                        )}

                        {/* PHILOSOPHIE D'ENTRAÎNEMENT */}
                        {planEntrainementJSON.philosophie && (
                            <p
                                className="mt-4 rounded-lg bg-club-50 p-4 text-xs leading-relaxed text-club-700"
                                dangerouslySetInnerHTML={{ __html: contenuPropre(planEntrainementJSON.philosophie) }}
                            />
                        )}

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button type="button" onClick={handleGenerate} className="rounded-lg bg-accent-500 px-6 py-3 font-medium text-white transition hover:bg-accent-700">
                                Générer le plan
                            </button>
                            <button
                                type="button"
                                onClick={handleExportImage}
                                disabled={isExporting}
                                className="flex items-center gap-2 rounded-lg border border-club-200 px-6 py-3 font-medium text-club-700 transition hover:bg-club-50 disabled:opacity-50 text-sm"
                            >
                                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {isExporting ? "Génération de l'image..." : "Télécharger l'image (Imprimer)"}
                            </button>

                            <button
                                type="button"
                                onClick={handleExportPlanTexte}
                                disabled={generationPlanTexte}
                                className="flex items-center gap-2 rounded-lg border border-club-200 px-6 py-3 font-medium text-club-700 transition hover:bg-club-50 disabled:opacity-50 text-sm"
                            >
                                {generationPlanTexte ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    copieReussie ? <Check size={16} /> : <Clipboard size={16} />
                                )}
                                {copieReussie ? "Copié dans le presse-papier !" : "Copier le plan (Texte)"}
                            </button>
                        </div>
                    </div>

                    {/* ZONE DE CAPTURE POUR L'IMAGE */}
                    <div ref={planContainerRef} className="mt-8 bg-white p-4 rounded-xl">

                        {/* EN-TÊTE RÉCAPITULATIF DES PARAMÈTRES POUR L'IMAGE */}
                        <div className="mb-6 rounded-xl border border-club-200 bg-club-50 p-5">
                            <div className="flex items-center justify-between border-b border-club-200 pb-3 mb-3">
                                <h2 className="font-display text-lg font-bold text-club-900">
                                    Plan d'Entraînement - {DIST_PARAMS[distance].label}
                                </h2>
                                <span className="text-xs font-semibold text-club-600 uppercase">
                                    Running Vincennes Association
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <span className="text-club-400 block font-medium uppercase">VMA</span>
                                    <span className="font-bold text-club-800 text-sm">{vma} km/h</span>
                                </div>
                                <div>
                                    <span className="text-club-400 block font-medium uppercase">Durée</span>
                                    <span className="font-bold text-club-800 text-sm">{nbSemaines} Semaines</span>
                                </div>
                                <div>
                                    <span className="text-club-400 block font-medium uppercase">Fréquence</span>
                                    <span className="font-bold text-club-800 text-sm">{seances} séances / sem.</span>
                                </div>
                                <div>
                                    <span className="text-club-400 block font-medium uppercase">Volume max</span>
                                    <span className="font-bold text-accent-500 text-sm">~{targetKm} km / sem.</span>
                                </div>
                            </div>
                        </div>

                        {/* SEMAINES */}
                        <div className="flex flex-col gap-6">
                            {weeks.length === 0 && <p className="py-16 text-center text-sm text-club-400">Aucune semaine — cliquez sur « Générer le plan ».</p>}

                            {weeks.map((w) => {
                                const totals = weekTotals(w);
                                return (
                                    <article key={w.num} className="overflow-hidden rounded-xl border border-club-100 bg-white">
                                        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 ${WEEK_TYPE_BAR[w.type]}`}>
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 font-display text-sm font-bold text-club-700">S{w.num}</span>
                                                <div>
                                                    <h3 className="font-display text-base font-semibold uppercase tracking-wide text-white">Semaine {w.num}</h3>
                                                    <span className="text-xs uppercase tracking-wide text-white/80">
                                                        {WEEK_TYPE_LABEL[w.type]} · {WEEK_TYPE_TAG[w.type]}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="font-display text-lg font-bold text-white">{totals.km} km</div>
                                                    <div className="text-xs text-white/80">{totals.durStr}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                            {w.sessions.map((s, si) => (
                                                <div key={si} className="border-b border-r border-club-100 p-5 last:border-r-0">
                                                    <span className={`mb-2 inline-block rounded-full px-3 py-1 text-[11px] font-medium ${WEEK_TYPE_BADGE[w.type]}`}>{s.label}</span>
                                                    <p className="text-xs leading-relaxed text-club-900/70">{s.desc}</p>
                                                    <p className="mt-3 font-display text-sm font-bold text-accent-500">{s.pace}</p>
                                                    <p className="mt-1 text-xs font-medium text-club-600">{s.vol}</p>
                                                    <p className="mt-2 border-t border-dashed border-club-100 pt-2 text-[11px] text-club-400">{formatMin(s.durationMin)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}