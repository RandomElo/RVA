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
    /** Jour de la semaine (0 = lundi … 6 = dimanche), quand les jours d'entraînement sont choisis. */
    jour?: number;
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

export const DISTANCE_KM: Record<DistanceKey, number> = { "5km": 5, "10km": 10, semi: 21.0975, marathon: 42.195 };

export const DIST_VOLUME_FACTOR: Record<DistanceKey, number> = { "5km": 0.75, "10km": 1.0, semi: 1.15, marathon: 1.35 };

export const WARMUP_KM = 6;
export const COOLDOWN_KM = 3;

/* ============================== CONSTANTES MÉTIER ============================== */

// Bornes de VMA acceptées (km/h). En dehors, les allures calculées n'ont plus de sens
// (et une VMA nulle provoquerait une division par zéro dans les calculs de durée).
export const VMA_MIN = 8;
export const VMA_MAX = 24;

// Bornes des champs du formulaire.
export const NB_SEMAINES_MIN = 3;
export const NB_SEMAINES_MAX = 20;
export const KM_HEBDO_MIN = 15;
export const KM_HEBDO_MAX = 220;

// Jours d'entraînement : au moins 2 séances, et au moins un jour de repos par semaine.
export const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;
export const JOURS_PAR_DEFAUT = [1, 3, 6]; // mardi, jeudi, dimanche
export const NB_JOURS_MIN = 2;
export const NB_JOURS_MAX = 6;

// Temps objectif accepté par distance (secondes) : au-delà, la saisie est une faute de frappe.
export const BORNES_TEMPS_OBJECTIF: Record<DistanceKey, { min: number; max: number }> = {
    "5km": { min: 12 * 60, max: 60 * 60 },
    "10km": { min: 26 * 60, max: 2 * 3600 },
    semi: { min: 57 * 60, max: 4 * 3600 },
    marathon: { min: 2 * 3600, max: 7 * 3600 },
};

// % de VMA au-delà duquel un objectif n'est pas tenable sur la distance (même à très haut niveau).
export const PCT_VMA_MAX_REALISTE: Record<DistanceKey, number> = { "5km": 1.0, "10km": 0.95, semi: 0.9, marathon: 0.86 };

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
    /** % de VMA de l'allure objectif (temps visé) : remplace la fourchette par défaut de l'allure spécifique. */
    pctAllureObjectif?: number;
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

function seanceAllureSpe({ vma, params, factor, ageFactor, pctAllureObjectif }: ContexteSeance): Session {
    const dur = Math.max(DUREE_MIN_EFFORT_CONTINU, roundTo(params.allureSpeBaseMin * factor, PAS_ARRONDI_DUREE_MIN));
    // Avec un temps visé, l'allure est celle de l'objectif (déjà propre au coureur : pas de facteur âge)
    const pctMin = pctAllureObjectif ?? params.allureSpePct[0] * ageFactor;
    const pctMax = pctAllureObjectif ?? params.allureSpePct[1] * ageFactor;
    const pctMid = (pctMin + pctMax) / 2;
    const { warmMin, coolMin } = calculerEchauffementEtRecuperation(vma);
    return {
        kind: "ALLURE_SPE",
        label: "Allure spécifique",
        desc: `Échauffement ${WARMUP_KM} km, effort continu à l'allure visée le jour de la course, puis récup ${COOLDOWN_KM} km.`,
        pace: pctAllureObjectif === undefined ? paceRange(vma, pctMin, pctMax) : `${paceFromPct(vma, pctAllureObjectif)} /km (allure objectif)`,
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
export function buildSession(kind: SessionKind, vma: number, params: DistParams, factor: number, ageFactor: number = 1, pctAllureObjectif?: number): Session {
    // Garde pour les appels non typés (valeur venue de l'extérieur) : le typage garantit le reste.
    if (!Object.prototype.hasOwnProperty.call(CONSTRUCTEURS_SEANCE, kind)) {
        throw new Error(`Type de séance inconnu : ${kind}`);
    }
    return CONSTRUCTEURS_SEANCE[kind]({ vma, params, factor, ageFactor, pctAllureObjectif });
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

/* ============================== RÉPARTITION DANS LA SEMAINE ============================== */

/*
 * Principe difficile / facile : les séances exigeantes (qualité et sortie longue) sont
 * espacées d'au moins 48 h, avec un jour de repos ou un footing entre elles. Quand les
 * jours choisis obligent à en enchaîner deux, on préfère la qualité puis la sortie longue
 * (courue lentement, la fatigue de la veille est acceptable) plutôt que l'inverse
 * (fractionné ou seuil sur des jambes entamées), et jamais deux séances de qualité d'affilée.
 */
export type RoleSeance = "qualite" | "longue" | "facile";

export function roleSeance(kind: SessionKind): RoleSeance {
    if (kind === "LONGUE") return "longue";
    if (kind === "SEUIL" || kind === "FRAC_COURT" || kind === "FRAC_LONG" || kind === "ALLURE_SPE") return "qualite";
    return "facile";
}

export const PENALITE_QUALITE_PUIS_QUALITE = 100;
export const PENALITE_LONGUE_PUIS_QUALITE = 60;
export const PENALITE_QUALITE_PUIS_LONGUE = 30;
// Petit bonus pour une sortie longue le week-end, là où il y a le plus de temps.
export const BONUS_LONGUE_WEEK_END = 5;

export function penaliteEnchainement(avant: RoleSeance, apres: RoleSeance): number {
    if (avant === "facile" || apres === "facile") return 0;
    if (avant === "qualite" && apres === "qualite") return PENALITE_QUALITE_PUIS_QUALITE;
    if (avant === "longue") return PENALITE_LONGUE_PUIS_QUALITE;
    return PENALITE_QUALITE_PUIS_LONGUE;
}

export interface SeancePlacee {
    jour: number;
    kind: SessionKind;
}

function permutations<T>(elements: T[]): T[][] {
    if (elements.length <= 1) return [elements];
    return elements.flatMap((element, i) => permutations([...elements.slice(0, i), ...elements.slice(i + 1)]).map((reste) => [element, ...reste]));
}

/** Paires de séances placées sur deux jours consécutifs (la semaine boucle : dimanche puis lundi). */
export function enchainements(placement: SeancePlacee[]): [SeancePlacee, SeancePlacee][] {
    return placement.flatMap((seance, i) => {
        const suivante = placement[(i + 1) % placement.length];
        return placement.length > 1 && (suivante.jour - seance.jour + 7) % 7 === 1 ? [[seance, suivante] as [SeancePlacee, SeancePlacee]] : [];
    });
}

function scorePlacement(placement: SeancePlacee[]): number {
    let score = 0;
    for (const [avant, apres] of enchainements(placement)) score += penaliteEnchainement(roleSeance(avant.kind), roleSeance(apres.kind));
    for (const { jour, kind } of placement) if (kind === "LONGUE" && jour >= 5) score -= BONUS_LONGUE_WEEK_END;
    return score;
}

/** Attribue chaque séance à un jour (jours triés du lundi au dimanche) en minimisant les enchaînements difficiles. */
export function placerSeances(kinds: SessionKind[], jours: number[]): SeancePlacee[] {
    const joursTries = [...jours].sort((a, b) => a - b);
    let meilleur: SeancePlacee[] = [];
    let meilleurScore = Infinity;
    for (const ordre of permutations(kinds)) {
        const placement = joursTries.map((jour, i) => ({ jour, kind: ordre[i] }));
        const score = scorePlacement(placement);
        if (score < meilleurScore) {
            meilleur = placement;
            meilleurScore = score;
        }
    }
    return meilleur;
}

/** Enchaînements de deux séances exigeantes que les jours choisis n'ont pas permis d'éviter. */
export function enchainementsDifficiles(placement: SeancePlacee[]): [SeancePlacee, SeancePlacee][] {
    return enchainements(placement).filter(([avant, apres]) => penaliteEnchainement(roleSeance(avant.kind), roleSeance(apres.kind)) > 0);
}

/* ============================== OBJECTIF CHRONO ============================== */

/** Lit un temps « mm:ss » ou « h:mm:ss » et renvoie des secondes, ou null si la saisie est invalide. */
export function lireTemps(texte: string): number | null {
    const morceaux = texte.trim().split(":");
    if (morceaux.length < 2 || morceaux.length > 3 || morceaux.some((m) => !/^\d{1,2}$/.test(m))) return null;
    const [secondes, minutes, heures = 0] = morceaux.map(Number).reverse();
    if (secondes >= 60 || (morceaux.length === 3 && minutes >= 60)) return null;
    return heures * 3600 + minutes * 60 + secondes;
}

export function formaterTemps(total: number): string {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.round(total % 60);
    const mmss = `${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
    return h > 0 ? `${h}:${mmss}` : mmss;
}

export type NiveauObjectif = "irrealiste" | "ambitieux" | "coherent" | "prudent";

/** Situe un temps visé par rapport à la VMA : % de VMA à tenir sur la distance. */
export function evaluerObjectif(distanceKey: DistanceKey, secondes: number, vma: number, ageBracket: AgeBracket): { pct: number; niveau: NiveauObjectif } {
    const pct = DISTANCE_KM[distanceKey] / (secondes / 3600) / vma;
    let niveau: NiveauObjectif = "coherent";
    if (pct > PCT_VMA_MAX_REALISTE[distanceKey]) niveau = "irrealiste";
    else if (pct > DIST_PARAMS[distanceKey].allureSpePct[1] * AGE_PACE_FACTOR[ageBracket]) niveau = "ambitieux";
    else if (pct < PACE_PCT.EF.max) niveau = "prudent";
    return { pct, niveau };
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

export interface OptionsPlan {
    /** Jours d'entraînement (0 = lundi … 6 = dimanche), autant que de séances : les séances y sont placées. */
    jours?: number[];
    /** % de VMA de l'allure objectif, utilisé par les séances d'allure spécifique. */
    pctAllureObjectif?: number;
}

export function generateWeeks(distanceKey: DistanceKey, vma: number, nbSeances: number, nbSemaines: number, targetKm: number, ageBracket: AgeBracket, options: OptionsPlan = {}): Week[] {
    const { jours, pctAllureObjectif } = options;
    const params = scaledParamsFor(distanceKey, nbSeances, targetKm, vma);
    const ageFactor = AGE_PACE_FACTOR[ageBracket];
    const planTypes = computeWeekPlanTypes(nbSemaines, distanceKey);
    const lateBlockStart = nbSemaines - (distanceKey === "marathon" || distanceKey === "semi" ? 4 : 3);
    return planTypes.map((wt, idx) => {
        const weekIndex = idx + 1;
        const isLateBlock = weekIndex > lateBlockStart || wt.type === "taper";
        const kinds = getSessionKinds(nbSeances, weekIndex, isLateBlock);
        const placement = jours && jours.length === kinds.length ? placerSeances(kinds, jours) : kinds.map((kind) => ({ kind, jour: undefined }));
        const sessions = placement.map(({ kind, jour }) => ({ ...buildSession(kind, vma, params, wt.factor, ageFactor, pctAllureObjectif), jour }));
        return { num: weekIndex, type: wt.type, sessions };
    });
}
