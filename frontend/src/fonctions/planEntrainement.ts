/**
 * Logique pure du générateur de plans d'entraînement (sans React), extraite
 * de pages/ressources/PlanEntrainement.tsx pour pouvoir être testée.
 */

/* ============================== TYPES ============================== */

export type DistanceKey = "5km" | "10km" | "semi" | "marathon";
export type SessionKind = "EF" | "LONGUE" | "SEUIL" | "FRAC_COURT" | "FRAC_LONG" | "ALLURE_SPE" | "RECUP" | "PPG";
export type WeekType = "build" | "recovery" | "taper";
export type AgeBracket = "<35" | "35-45" | "45-55" | "55+";

export interface DistParams {
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

export interface Session {
    kind: SessionKind;
    label: string;
    desc: string;
    pace: string;
    vol: string;
    durationMin: number;
    distanceKm: number;
}

export interface Week {
    num: number;
    type: WeekType;
    sessions: Session[];
}

export const DIST_PARAMS: Record<DistanceKey, DistParams> = {
    "5km": { label: "5 km", defWeeks: 8, longueBase: 10, seuilBaseMin: 18, efBaseMin: 38, allureSpeBaseMin: 14, fracCourt: { reps: 12, dist: 300 }, fracLong: { reps: 6, dist: 600 }, allureSpePct: [0.95, 0.98] },
    "10km": { label: "10 km", defWeeks: 10, longueBase: 14, seuilBaseMin: 25, efBaseMin: 45, allureSpeBaseMin: 20, fracCourt: { reps: 10, dist: 400 }, fracLong: { reps: 6, dist: 800 }, allureSpePct: [0.9, 0.93] },
    semi: { label: "Semi-marathon", defWeeks: 12, longueBase: 19, seuilBaseMin: 30, efBaseMin: 50, allureSpeBaseMin: 30, fracCourt: { reps: 10, dist: 400 }, fracLong: { reps: 5, dist: 1000 }, allureSpePct: [0.85, 0.88] },
    marathon: { label: "Marathon", defWeeks: 14, longueBase: 32, seuilBaseMin: 35, efBaseMin: 60, allureSpeBaseMin: 45, fracCourt: { reps: 8, dist: 400 }, fracLong: { reps: 5, dist: 1000 }, allureSpePct: [0.78, 0.82] },
};

export const DIST_VOLUME_FACTOR: Record<DistanceKey, number> = { "5km": 0.75, "10km": 1.0, semi: 1.15, marathon: 1.35 };

export const WARMUP_KM = 6;
export const COOLDOWN_KM = 3;

/* ============================== CONSTANTES MÉTIER ============================== */

// Bornes de VMA acceptées (km/h). En dehors, les allures calculées n'ont plus de sens
// (et une VMA nulle provoquerait une division par zéro dans les calculs de durée).
export const VMA_MIN = 8;
export const VMA_MAX = 24;

// % de VMA utilisés pour estimer la durée de l'échauffement et du retour au calme
// des séances de qualité (footing lent avant/après l'effort).
export const PCT_ALLURE_ECHAUFFEMENT = 0.65;
export const PCT_ALLURE_RECUPERATION = 0.6;
// % de VMA du trot de récupération entre deux fractions.
export const PCT_ALLURE_TROT_ENTRE_FRACTIONS = 0.5;

// Minutes de récupération trottée comptées par fraction (1' à 1'30 en court, 2' à 3' en long).
export const RECUP_MIN_PAR_FRACTION_COURT = 1.25;
export const RECUP_MIN_PAR_FRACTION_LONG = 2.5;

// Pas d'arrondi des durées de séance (minutes).
export const PAS_ARRONDI_DUREE_MIN = 5;

// Planchers de volume par type de séance, même en semaine allégée ou d'affûtage.
export const DUREE_MIN_EF = 25; // minutes
export const DISTANCE_MIN_LONGUE_KM = 5;
export const DUREE_MIN_EFFORT_CONTINU = 10; // minutes d'effort (seuil, allure spécifique)
export const REPETITIONS_MIN_FRAC_COURT = 4;
export const REPETITIONS_MIN_FRAC_LONG = 3;

// Footing de récupération et PPG : durée de base (à facteur 1) et plancher, en minutes.
export const DUREE_BASE_RECUP = 20;
export const DUREE_MIN_RECUP = 15;
export const DUREE_BASE_PPG = 30;
export const DUREE_MIN_PPG = 20;

// Périodisation : une semaine d'assimilation toutes les N semaines, et facteurs de volume.
export const FREQUENCE_SEMAINE_ASSIMILATION = 4;
export const FACTEUR_VOLUME_ASSIMILATION = 0.62;
export const FACTEUR_VOLUME_AFFUTAGE_1 = 0.6; // première semaine d'affûtage
export const FACTEUR_VOLUME_AFFUTAGE_2 = 0.42; // dernière semaine d'affûtage (semi, marathon)
// Semaines de développement : le volume monte linéairement de 70 % à 100 % jusqu'au pic.
export const FACTEUR_VOLUME_DEBUT_PREPA = 0.7;
export const PROGRESSION_VOLUME_PREPA = 0.3;

// Suggestion de km hebdo en pointe : droite calée sur un 10 km (6 × VMA - 30),
// avec un plancher, puis arrondie au multiple de 5 km.
export const KM_SUGGERES_PAR_KMH_VMA = 6;
export const KM_SUGGERES_DECALAGE = 30;
export const KM_SUGGERES_MIN = 20;
export const PAS_ARRONDI_KM_SUGGERES = 5;

// Bornes du facteur d'échelle appliqué au plan de base pour atteindre le km hebdo visé.
export const ECHELLE_VOLUME_MIN = 0.4;
export const ECHELLE_VOLUME_MAX = 3;

/*
 * Source unique de vérité pour les % de VMA de chaque type de séance.
 * Utilisée à la fois par buildSession() (calcul réel des allures) et par
 * la modale "Notre méthode" (affichage). Modifier une valeur ici la met
 * à jour automatiquement aux deux endroits — plus de risque de décalage
 * entre le texte affiché et l'allure réellement calculée.
 */
export const PACE_PCT: Record<"RECUP" | "EF" | "LONGUE" | "SEUIL" | "FRAC_LONG" | "FRAC_COURT", { min: number; max: number }> = {
    RECUP: { min: 0.55, max: 0.65 },
    EF: { min: 0.58, max: 0.68 },
    LONGUE: { min: 0.63, max: 0.68 },
    SEUIL: { min: 0.85, max: 0.9 },
    FRAC_LONG: { min: 0.9, max: 0.95 },
    FRAC_COURT: { min: 1.0, max: 1.1 },
};

/*
 * Facteur appliqué au % de VMA des séances de qualité (seuil, fractionné
 * court/long, allure spécifique) uniquement. À VMA identique, la capacité à
 * tenir une intensité élevée diminue avec l'âge (récupération plus lente
 * entre les répétitions et les séances, fatigue plus rapide). Les allures
 * d'endurance fondamentale et de sortie longue ne sont pas modifiées : elles
 * sont déjà conservatrices et ne posent pas ce problème.
 *
 * Ce sont des coefficients de prudence, pas une table scientifique figée —
 * à ajuster si l'expérience du club suggère d'autres valeurs.
 */
export const AGE_PACE_FACTOR: Record<AgeBracket, number> = {
    "<35": 1,
    "35-45": 0.99,
    "45-55": 0.97,
    "55+": 0.94,
};

/* ============================== CALCULS ============================== */

export function speedFromPct(vma: number, pct: number) {
    return vma * pct;
}
export function distKmForMin(min: number, vma: number, pct: number) {
    return speedFromPct(vma, pct) * (min / 60);
}
export function minForKm(km: number, vma: number, pct: number) {
    return (km / speedFromPct(vma, pct)) * 60;
}
export function roundTo(v: number, step: number) {
    return Math.round(v / step) * step;
}
export function paceFromPct(vma: number, pct: number) {
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
/**
 * Formate une fourchette d'allure de façon non ambiguë : "Entre X et Y /km"
 * plutôt qu'une notation avec flèche (→), qui pouvait laisser penser à une
 * progression pendant la séance alors qu'il s'agit d'une simple fourchette
 * dans laquelle rester.
 */
export function paceRange(vma: number, pctMin: number, pctMax: number) {
    return `Entre ${paceFromPct(vma, pctMin)} et ${paceFromPct(vma, pctMax)} /km`;
}
export function estVmaValide(vma: number) {
    return Number.isFinite(vma) && vma >= VMA_MIN && vma <= VMA_MAX;
}

/** Durées (minutes) de l'échauffement et du retour au calme communs aux séances de qualité. */
export function calculerEchauffementEtRecuperation(vma: number) {
    return {
        warmMin: minForKm(WARMUP_KM, vma, PCT_ALLURE_ECHAUFFEMENT),
        coolMin: minForKm(COOLDOWN_KM, vma, PCT_ALLURE_RECUPERATION),
    };
}

export function formatMin(min: number) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

/** Paramètres communs transmis à chaque constructeur de séance. */
interface ContexteSeance {
    vma: number;
    params: DistParams;
    factor: number;
    ageFactor: number;
}

function seanceEF({ vma, params, factor }: ContexteSeance): Session {
    const dur = Math.max(DUREE_MIN_EF, roundTo(params.efBaseMin * factor, PAS_ARRONDI_DUREE_MIN));
    return {
        kind: "EF",
        label: "Endurance fondamentale",
        desc: "Footing continu, aisance respiratoire, discussion possible.",
        pace: paceRange(vma, PACE_PCT.EF.min, PACE_PCT.EF.max),
        vol: `${dur} min`,
        durationMin: dur,
        distanceKm: distKmForMin(dur, vma, (PACE_PCT.EF.min + PACE_PCT.EF.max) / 2),
    };
}

function seanceLongue({ vma, params, factor }: ContexteSeance): Session {
    const km = Math.max(DISTANCE_MIN_LONGUE_KM, Math.round(params.longueBase * factor * 10) / 10);
    return {
        kind: "LONGUE",
        label: "Sortie longue",
        desc: "Endurance, allure régulière, terrain roulant.",
        pace: paceRange(vma, PACE_PCT.LONGUE.min, PACE_PCT.LONGUE.max),
        vol: `${km} km`,
        durationMin: minForKm(km, vma, (PACE_PCT.LONGUE.min + PACE_PCT.LONGUE.max) / 2),
        distanceKm: km,
    };
}

function seanceSeuil({ vma, params, factor, ageFactor }: ContexteSeance): Session {
    const dur = Math.max(DUREE_MIN_EFFORT_CONTINU, roundTo(params.seuilBaseMin * factor, PAS_ARRONDI_DUREE_MIN));
    const pctMin = PACE_PCT.SEUIL.min * ageFactor;
    const pctMax = PACE_PCT.SEUIL.max * ageFactor;
    const pctMid = (pctMin + pctMax) / 2;
    const { warmMin, coolMin } = calculerEchauffementEtRecuperation(vma);
    return {
        kind: "SEUIL",
        label: "Seuil (tempo)",
        desc: `Échauffement ${WARMUP_KM} km, effort continu soutenu mais tenable, puis récup ${COOLDOWN_KM} km.`,
        pace: paceRange(vma, pctMin, pctMax),
        vol: `${WARMUP_KM}km éch. + ${dur}min continu + ${COOLDOWN_KM}km récup`,
        durationMin: dur + warmMin + coolMin,
        distanceKm: distKmForMin(dur, vma, pctMid) + WARMUP_KM + COOLDOWN_KM,
    };
}

function seanceAllureSpe({ vma, params, factor, ageFactor }: ContexteSeance): Session {
    const dur = Math.max(DUREE_MIN_EFFORT_CONTINU, roundTo(params.allureSpeBaseMin * factor, PAS_ARRONDI_DUREE_MIN));
    const pctMin = params.allureSpePct[0] * ageFactor;
    const pctMax = params.allureSpePct[1] * ageFactor;
    const pctMid = (pctMin + pctMax) / 2;
    const { warmMin, coolMin } = calculerEchauffementEtRecuperation(vma);
    return {
        kind: "ALLURE_SPE",
        label: "Allure spécifique",
        desc: `Échauffement ${WARMUP_KM} km, effort continu à l'allure visée le jour de la course, puis récup ${COOLDOWN_KM} km.`,
        pace: paceRange(vma, pctMin, pctMax),
        vol: `${WARMUP_KM}km éch. + ${dur}min allure spécifique + ${COOLDOWN_KM}km récup`,
        durationMin: dur + warmMin + coolMin,
        distanceKm: distKmForMin(dur, vma, pctMid) + WARMUP_KM + COOLDOWN_KM,
    };
}

function seanceFracCourt({ vma, params, factor, ageFactor }: ContexteSeance): Session {
    const reps = Math.max(REPETITIONS_MIN_FRAC_COURT, Math.round(params.fracCourt.reps * factor));
    const runKm = (reps * params.fracCourt.dist) / 1000;
    const pctMin = PACE_PCT.FRAC_COURT.min * ageFactor;
    const pctMax = PACE_PCT.FRAC_COURT.max * ageFactor;
    const runMin = minForKm(runKm, vma, ((PACE_PCT.FRAC_COURT.min + PACE_PCT.FRAC_COURT.max) / 2) * ageFactor);
    const recupMin = reps * RECUP_MIN_PAR_FRACTION_COURT;
    const { warmMin, coolMin } = calculerEchauffementEtRecuperation(vma);
    return {
        kind: "FRAC_COURT",
        label: "Fractionné court",
        desc: `Échauffement ${WARMUP_KM} km, puis ${reps} × ${params.fracCourt.dist}m (récup trot 1' à 1'30 entre les fractions), puis récup ${COOLDOWN_KM} km.`,
        pace: paceRange(vma, pctMin, pctMax),
        vol: `${WARMUP_KM}km éch. + ${reps}×${params.fracCourt.dist}m + ${COOLDOWN_KM}km récup`,
        durationMin: runMin + recupMin + warmMin + coolMin,
        distanceKm: runKm + distKmForMin(recupMin, vma, PCT_ALLURE_TROT_ENTRE_FRACTIONS) + WARMUP_KM + COOLDOWN_KM,
    };
}

function seanceFracLong({ vma, params, factor, ageFactor }: ContexteSeance): Session {
    const reps = Math.max(REPETITIONS_MIN_FRAC_LONG, Math.round(params.fracLong.reps * factor));
    const runKm = (reps * params.fracLong.dist) / 1000;
    const pctMin = PACE_PCT.FRAC_LONG.min * ageFactor;
    const pctMax = PACE_PCT.FRAC_LONG.max * ageFactor;
    const runMin = minForKm(runKm, vma, ((PACE_PCT.FRAC_LONG.min + PACE_PCT.FRAC_LONG.max) / 2) * ageFactor);
    const recupMin = reps * RECUP_MIN_PAR_FRACTION_LONG;
    const { warmMin, coolMin } = calculerEchauffementEtRecuperation(vma);
    return {
        kind: "FRAC_LONG",
        label: "Fractionné long",
        desc: `Échauffement ${WARMUP_KM} km, puis ${reps} × ${params.fracLong.dist}m (récup trot 2' à 3' entre les fractions), puis récup ${COOLDOWN_KM} km.`,
        pace: paceRange(vma, pctMin, pctMax),
        vol: `${WARMUP_KM}km éch. + ${reps}×${params.fracLong.dist}m + ${COOLDOWN_KM}km récup`,
        durationMin: runMin + recupMin + warmMin + coolMin,
        distanceKm: runKm + distKmForMin(recupMin, vma, PCT_ALLURE_TROT_ENTRE_FRACTIONS) + WARMUP_KM + COOLDOWN_KM,
    };
}

function seanceRecup({ vma, factor }: ContexteSeance): Session {
    const dur = Math.max(DUREE_MIN_RECUP, roundTo(DUREE_BASE_RECUP * factor, PAS_ARRONDI_DUREE_MIN));
    return {
        kind: "RECUP",
        label: "Footing récupération",
        desc: "Très facile, décrassage, aucune notion de performance.",
        pace: paceRange(vma, PACE_PCT.RECUP.min, PACE_PCT.RECUP.max),
        vol: `${dur} min`,
        durationMin: dur,
        distanceKm: distKmForMin(dur, vma, (PACE_PCT.RECUP.min + PACE_PCT.RECUP.max) / 2),
    };
}

function seancePPG({ factor }: ContexteSeance): Session {
    const dur = Math.max(DUREE_MIN_PPG, roundTo(DUREE_BASE_PPG * factor, PAS_ARRONDI_DUREE_MIN));
    return {
        kind: "PPG",
        label: "PPG / renforcement",
        desc: "Gainage, proprioception, renforcement musculaire — pas de course.",
        pace: "—",
        vol: `${dur} min`,
        durationMin: dur,
        distanceKm: 0,
    };
}

/*
 * Un constructeur par type de séance. Le type Record<SessionKind, …> oblige
 * TypeScript à signaler tout type de séance ajouté sans constructeur (erreur de
 * compilation), au lieu d'un plantage à l'exécution.
 */
export const CONSTRUCTEURS_SEANCE: Readonly<Record<SessionKind, (ctx: ContexteSeance) => Session>> = {
    EF: seanceEF,
    LONGUE: seanceLongue,
    SEUIL: seanceSeuil,
    ALLURE_SPE: seanceAllureSpe,
    FRAC_COURT: seanceFracCourt,
    FRAC_LONG: seanceFracLong,
    RECUP: seanceRecup,
    PPG: seancePPG,
};

/**
 * @param ageFactor Facteur multiplicatif appliqué au % de VMA des séances de
 * qualité (SEUIL, FRAC_COURT, FRAC_LONG, ALLURE_SPE). 1 = aucun ajustement.
 * Les autres types de séance (EF, LONGUE, RECUP, PPG) l'ignorent.
 */
export function buildSession(kind: SessionKind, vma: number, params: DistParams, factor: number, ageFactor: number = 1): Session {
    // Garde pour les appels non typés (valeur venue de l'extérieur) : le typage garantit le reste.
    if (!Object.prototype.hasOwnProperty.call(CONSTRUCTEURS_SEANCE, kind)) {
        throw new Error(`Type de séance inconnu : ${kind}`);
    }
    return CONSTRUCTEURS_SEANCE[kind]({ vma, params, factor, ageFactor });
}

export function getSessionKinds(nbSeances: number, weekIndex: number, isLateBlock: boolean): SessionKind[] {
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

export function computeWeekPlanTypes(nbWeeks: number, distanceKey: DistanceKey): { type: WeekType; factor: number }[] {
    const taperWeeks = distanceKey === "marathon" || distanceKey === "semi" ? 2 : 1;
    const peakWeek = Math.max(1, nbWeeks - taperWeeks);
    const result: { type: WeekType; factor: number }[] = [];
    for (let i = 1; i <= nbWeeks; i++) {
        if (i > peakWeek) {
            const posInTaper = i - peakWeek;
            result.push({ type: "taper", factor: posInTaper === 1 ? FACTEUR_VOLUME_AFFUTAGE_1 : FACTEUR_VOLUME_AFFUTAGE_2 });
        } else if (i % FREQUENCE_SEMAINE_ASSIMILATION === 0) {
            result.push({ type: "recovery", factor: FACTEUR_VOLUME_ASSIMILATION });
        } else {
            const ramp = peakWeek > 1 ? (i - 1) / (peakWeek - 1) : 1;
            result.push({ type: "build", factor: Math.min(1, FACTEUR_VOLUME_DEBUT_PREPA + PROGRESSION_VOLUME_PREPA * ramp) });
        }
    }
    return result;
}

export function suggestPeakKm(vma: string, distanceKey: DistanceKey) {
    const vmaNumber = parseFloat(vma) || 0;
    const base = KM_SUGGERES_PAR_KMH_VMA * vmaNumber - KM_SUGGERES_DECALAGE; // calé sur un 10 km
    const factor = DIST_VOLUME_FACTOR[distanceKey] || 1;
    const raw = Math.max(KM_SUGGERES_MIN, base) * factor;
    return (Math.round(raw / PAS_ARRONDI_KM_SUGGERES) * PAS_ARRONDI_KM_SUGGERES).toString();
}

export function computeBasePeakKm(params: DistParams, nbSeances: number, vma: number) {
    const kinds = getSessionKinds(nbSeances, 1, false);
    return kinds.reduce((total, k) => total + buildSession(k, vma, params, 1).distanceKm, 0);
}

export function scaledParamsFor(distanceKey: DistanceKey, nbSeances: number, targetKm: number, vma: number): DistParams {
    const base = DIST_PARAMS[distanceKey];
    const basePeak = computeBasePeakKm(base, nbSeances, vma);
    let scale = basePeak > 0 ? targetKm / basePeak : 1;
    scale = Math.min(ECHELLE_VOLUME_MAX, Math.max(ECHELLE_VOLUME_MIN, scale));
    return {
        ...base,
        efBaseMin: base.efBaseMin * scale,
        longueBase: base.longueBase * scale,
        seuilBaseMin: base.seuilBaseMin * scale,
        allureSpeBaseMin: base.allureSpeBaseMin * scale,
        fracCourt: { ...base.fracCourt, reps: Math.max(REPETITIONS_MIN_FRAC_COURT, Math.round(base.fracCourt.reps * scale)) },
        fracLong: { ...base.fracLong, reps: Math.max(REPETITIONS_MIN_FRAC_LONG, Math.round(base.fracLong.reps * scale)) },
    };
}

export function weekTotals(w: Week) {
    let km = 0,
        min = 0;
    w.sessions.forEach((s) => {
        km += s.distanceKm || 0;
        min += s.durationMin || 0;
    });
    return { km: Math.round(km * 10) / 10, durStr: formatMin(min) };
}

export function generateWeeks(distanceKey: DistanceKey, vma: number, nbSeances: number, nbSemaines: number, targetKm: number, ageBracket: AgeBracket): Week[] {
    const params = scaledParamsFor(distanceKey, nbSeances, targetKm, vma);
    const ageFactor = AGE_PACE_FACTOR[ageBracket];
    const planTypes = computeWeekPlanTypes(nbSemaines, distanceKey);
    const lateBlockStart = nbSemaines - (distanceKey === "marathon" || distanceKey === "semi" ? 4 : 3);
    return planTypes.map((wt, idx) => {
        const weekIndex = idx + 1;
        const isLateBlock = weekIndex > lateBlockStart || wt.type === "taper";
        const kinds = getSessionKinds(nbSeances, weekIndex, isLateBlock);
        const sessions = kinds.map((k) => buildSession(k, vma, params, wt.factor, ageFactor));
        return { num: weekIndex, type: wt.type, sessions };
    });
}
