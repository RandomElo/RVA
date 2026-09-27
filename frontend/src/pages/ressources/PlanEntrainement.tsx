/**
 * Page "Générateur de plans d'entraînement".
 *
 * Calcule les allures de fractionné à partir de la VMA, plafonne à 2 séances
 * d'intensité par semaine, insère une semaine d'assimilation (volume réduit)
 * une semaine sur quatre, et affûte les 1 à 2 dernières semaines avant la course.
 *
 * Un facteur âge assouplit légèrement les allures des séances de qualité
 * (seuil, fractionné, allure spécifique) : à VMA égale, la capacité à
 * "tenir" une intensité élevée diminue avec l'âge (récupération plus lente
 * entre les répétitions, fatigue plus rapide). Les allures d'endurance
 * fondamentale et de sortie longue ne sont pas concernées.
 *
 * Les séances sont placées sur les jours choisis en laissant, autant que
 * possible, un jour facile entre deux séances exigeantes (qualité, sortie
 * longue). Un temps visé (facultatif) fixe l'allure des séances d'allure
 * spécifique et est comparé à la VMA pour signaler un objectif hors de portée.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { contenuPropre } from "../../fonctions/sanitizeur";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import { Loader2, Download, Clipboard, Check, Lightbulb, AlertCircle } from "lucide-react";
import SEO from "../../composants/generale/SEO";
import Modal from "../../composants/modal/Modal";
import { bloqueurToucheInvalide, bloqueurToucheInvalideEntier, nettoyerEntier, nettoyerNombre, nettoyerTemps, plafonner, relever } from "../../fonctions/nettoyeurNombre";
import { AGE_PACE_FACTOR, BORNES_TEMPS_OBJECTIF, DIST_PARAMS, JOURS_PAR_DEFAUT, JOURS_SEMAINE, KM_HEBDO_MAX, KM_HEBDO_MIN, NB_JOURS_MAX, NB_JOURS_MIN, NB_SEMAINES_MAX, NB_SEMAINES_MIN, PACE_PCT, VMA_MAX, VMA_MIN, enchainementsDifficiles, estVmaValide, evaluerObjectif, formatMin, formaterTemps, generateWeeks, getSessionKinds, lireTemps, paceFromPct, placerSeances, roleSeance, suggestPeakKm, weekTotals, type AgeBracket, type DistanceKey, type NiveauObjectif, type SeancePlacee, type Week, type WeekType } from "../../fonctions/planEntrainement";

/* ============================== DONNÉES DE BASE ============================== */
const DONNEES_PAR_DEFAUT = {
    titre: "Générateur de plans d'entraînement",
    description: "Choisissez la distance, la VMA et le nombre de séances par semaine : les allures et volumes de chaque séance se calculent automatiquement, avec des semaines d'assimilation à volume réduit et un affûtage avant la course.",
    avertissement: "<b>⚠️ Ceci n'est pas un plan encadré par un coach.</b> Cet outil génère automatiquement des idées de séances à partir de formules génériques (VMA, distance, nombre de séances). Il ne remplace pas l'avis d'un entraîneur qui connaît votre historique, vos sensations et vos éventuelles blessures. Utilisez-le comme point de départ pour vous inspirer, pas comme une prescription à suivre à la lettre. En cas de douleur, de fatigue inhabituelle ou de doute, adaptez la séance ou consultez un professionnel (coach du club, médecin du sport).",
    philosophie: "<b>Notre philosophie d'entraînement :</b> progresser sans se blesser. Le plan suit la logique 80/20 : la grande majorité des séances se courent en endurance fondamentale, à allure confortable, et seules 1 à 2 séances par semaine sont réellement intenses (seuil ou fractionné). La charge monte progressivement, avec une semaine allégée tous les 4 semaines pour laisser le corps assimiler le travail, puis un affûtage en fin de préparation pour arriver reposé le jour de la course. La régularité et la récupération comptent souvent plus que l'intensité d'une séance isolée."
}
// Textes de la page, surchargés par /textes/ressources/plan-entrainement.json
type TextesPlanEntrainement = typeof DONNEES_PAR_DEFAUT;

const CATEGORY_VMA: Record<string, number> = {
    "38": 18.5,
    "40": 17.5,
    "42": 16.5,
    "45": 15.5,
    "50": 14.5,
    "55": 13.5,
    "60": 12.5,
};

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

/* Libellés + descriptions courtes pour le tableau de la modale. */
const REPERES_ALLURES: { kind: keyof typeof PACE_PCT; label: string; desc: string }[] = [
    { kind: "RECUP", label: "Récupération", desc: "Décrassage, très facile" },
    { kind: "EF", label: "Endurance fondamentale", desc: "Aisance respiratoire, discussion possible" },
    { kind: "LONGUE", label: "Sortie longue", desc: "Allure régulière, terrain roulant" },
    { kind: "SEUIL", label: "Seuil (tempo)", desc: "Effort continu soutenu mais tenable" },
    { kind: "FRAC_LONG", label: "Fractionné long", desc: "400–1000m, récup trot 2' à 3'" },
    { kind: "FRAC_COURT", label: "Fractionné court", desc: "200–400m, récup trot 1' à 1'30" },
];

/* Contraste : le texte du bandeau (`text-white`, pleine opacité) doit
 * atteindre >= 4.5:1 sur chacun de ces fonds. bg-club-400 a été remplacé
 * par bg-club-700 pour la semaine d'assimilation (club-400 était trop
 * clair pour du texte blanc à pleine opacité). */
const WEEK_TYPE_BAR: Record<WeekType, string> = {
    build: "bg-club-600",
    recovery: "bg-club-700",
    taper: "bg-accent-600",
};

const WEEK_TYPE_BADGE: Record<WeekType, string> = {
    build: "bg-club-50 text-club-700",
    recovery: "bg-club-100 text-club-700",
    taper: "bg-accent-100 text-accent-700",
};

/* Tranches d'âge disponibles dans le formulaire. */
const AGE_BRACKETS: { key: AgeBracket; label: string }[] = [
    { key: "<35", label: "Moins de 35 ans" },
    { key: "35-45", label: "35 – 45 ans" },
    { key: "45-55", label: "45 – 55 ans" },
    { key: "55+", label: "55 ans et +" },
];

/* Exemple de temps visé affiché dans le champ vide, selon la distance. */
const EXEMPLE_TEMPS_VISE: Record<DistanceKey, string> = {
    "5km": "ex. 22:30",
    "10km": "ex. 45:00",
    semi: "ex. 1:39:30",
    marathon: "ex. 3:29:00",
};

const MESSAGE_OBJECTIF: Record<NiveauObjectif, string> = {
    irrealiste: "Objectif hors de portée avec cette VMA : revoyez le temps visé ou refaites un test de VMA.",
    ambitieux: "Objectif ambitieux pour cette VMA : les séances à allure objectif seront exigeantes.",
    coherent: "Objectif cohérent avec votre VMA.",
    prudent: "Allure plus lente que l'endurance fondamentale : objectif très prudent, ou VMA surestimée ?",
};

const COULEUR_OBJECTIF: Record<NiveauObjectif, string> = {
    irrealiste: "text-red-600",
    ambitieux: "text-amber-700",
    coherent: "text-club-600",
    prudent: "text-amber-700",
};

/* Explication d'un enchaînement de deux séances exigeantes sur des jours consécutifs. */
function messageEnchainement([avant, apres]: [SeancePlacee, SeancePlacee]): string {
    const jours = `${JOURS_SEMAINE[avant.jour]} puis ${JOURS_SEMAINE[apres.jour].toLowerCase()}`;
    const roleAvant = roleSeance(avant.kind);
    if (roleAvant === "qualite" && roleSeance(apres.kind) === "qualite") {
        return `${jours} : deux séances intenses d'affilée. Gardez si possible 48 h entre elles.`;
    }
    if (roleAvant === "longue") {
        return `${jours} : sortie longue puis séance intense, sur des jambes fatiguées. Un jour de repos entre les deux serait préférable.`;
    }
    return `${jours} : séance intense puis sortie longue. C'est jouable car la sortie longue se court lentement, mais un jour de repos entre les deux reste préférable.`;
}

/* ============================== COMPOSANT ============================== */

export default function PlanEntrainement() {
    const [distance, setDistance] = useState<DistanceKey>("10km");
    const [category, setCategory] = useState<string>("custom");
    const [vma, setVma] = useState<string>("15.5");
    const [ageBracket, setAgeBracket] = useState<AgeBracket>("<35");
    const [jours, setJours] = useState<number[]>(JOURS_PAR_DEFAUT);
    const seances = jours.length;
    const [objectif, setObjectif] = useState("");
    const [objectifTouche, setObjectifTouche] = useState(false);
    const [nbSemaines, setNbSemaines] = useState<string>(DIST_PARAMS["10km"].defWeeks.toString());
    const [targetKmSaisi, setTargetKmSaisi] = useState<string>("");
    const [targetKmManual, setTargetKmManual] = useState(false);
    // Suggestion de km hebdo, tant que l'entraîneur n'a pas tapé une valeur perso
    const targetKm = targetKmManual ? targetKmSaisi : suggestPeakKm(vma, distance);
    // Plan initial généré une seule fois avec les valeurs par défaut : ensuite, c'est le bouton « Générer le plan » qui régénère
    const [weeks, setWeeks] = useState<Week[]>(() => generateWeeks(distance, parseFloat(vma) || 0, seances, parseInt(nbSemaines, 10) || 1, parseFloat(targetKm) || 0, ageBracket, { jours }));
    const [planEntrainementJSON, setPlanEntrainementJSON] = useState<TextesPlanEntrainement>(DONNEES_PAR_DEFAUT);
    const [erreurVma, setErreurVma] = useState<string>("");
    const [isExporting, setIsExporting] = useState(false);
    const [generationPlanTexte, setGenerationPlanTexte] = useState<boolean>(false);
    const [copieReussie, setCopieReussie] = useState(false);
    const [modalMethodeOuverte, setModalMethodeOuverte] = useState(false);

    const planContainerRef = useRef<HTMLDivElement>(null);
    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        async function recuperation() {
            const donnees = await requeteJSON<TextesPlanEntrainement>("ressources/plan-entrainement", (nouvellesDonnees) => {
                if (nouvellesDonnees) setPlanEntrainementJSON(nouvellesDonnees)
            });
            if (donnees) setPlanEntrainementJSON(donnees);
        }
        recuperation();
    }, []);

    const categoryHint = useMemo(() => {
        if (category === "custom") return "";
        const label = category === "60" ? "1h" : `0:${category}`;
        return `VMA estimée pour un 10 km en ${label} — ajustez si vous connaissez la VMA réelle.`;
    }, [category]);

    // Temps visé : format et bornes de la distance, puis comparaison à la VMA
    const secondesObjectif = objectif === "" ? null : lireTemps(objectif);
    const bornesObjectif = BORNES_TEMPS_OBJECTIF[distance];
    let erreurObjectif = "";
    if (objectif !== "" && secondesObjectif === null) {
        erreurObjectif = "Format attendu : mm:ss ou h:mm:ss.";
    } else if (secondesObjectif !== null && (secondesObjectif < bornesObjectif.min || secondesObjectif > bornesObjectif.max)) {
        erreurObjectif = `Le temps visé doit être compris entre ${formaterTemps(bornesObjectif.min)} et ${formaterTemps(bornesObjectif.max)} sur ${DIST_PARAMS[distance].label}.`;
    }
    const numVmaSaisie = parseFloat(vma);
    const evaluation = secondesObjectif !== null && !erreurObjectif && estVmaValide(numVmaSaisie) ? evaluerObjectif(distance, secondesObjectif, numVmaSaisie, ageBracket) : null;
    const afficherErreurObjectif = objectifTouche && erreurObjectif !== "";

    const alertesEnchainement = useMemo(() => enchainementsDifficiles(placerSeances(getSessionKinds(jours.length, 1, false), jours)), [jours]);

    function basculerJour(jour: number) {
        setJours((actuels) => {
            if (actuels.includes(jour)) return actuels.length > NB_JOURS_MIN ? actuels.filter((j) => j !== jour) : actuels;
            return actuels.length < NB_JOURS_MAX ? [...actuels, jour].sort((a, b) => a - b) : actuels;
        });
    }

    function handleCategoryChange(v: string) {
        setCategory(v);
        if (v !== "custom") {
            setVma(CATEGORY_VMA[v].toString());
            setErreurVma("");
        }
    }
    function handleDistanceChange(v: DistanceKey) {
        setDistance(v);
        setNbSemaines(DIST_PARAMS[v].defWeeks.toString());
        // Les bornes du temps visé changent avec la distance
        setObjectif("");
        setObjectifTouche(false);
    }
    function handleGenerate() {
        const numVma = parseFloat(vma) || 0;
        if (!estVmaValide(numVma)) {
            setErreurVma(`La VMA doit être comprise entre ${VMA_MIN} et ${VMA_MAX} km/h.`);
            return;
        }
        setErreurVma("");
        setObjectifTouche(true);
        if (erreurObjectif || evaluation?.niveau === "irrealiste") return;
        // Champs vides ou hors bornes ramenés dans les limites, et affichés tels qu'utilisés
        const numNbSemaines = Math.min(NB_SEMAINES_MAX, Math.max(NB_SEMAINES_MIN, parseInt(nbSemaines, 10) || NB_SEMAINES_MIN));
        setNbSemaines(String(numNbSemaines));
        const numTargetKm = Math.min(KM_HEBDO_MAX, Math.max(KM_HEBDO_MIN, parseFloat(targetKm) || KM_HEBDO_MIN));
        if (targetKmManual) setTargetKmSaisi(String(numTargetKm));
        setWeeks(generateWeeks(distance, numVma, seances, numNbSemaines, numTargetKm, ageBracket, { jours, pctAllureObjectif: evaluation?.pct }));
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
            textePlan += `• Tranche d'âge : ${AGE_BRACKETS.find((b) => b.key === ageBracket)?.label ?? ageBracket}\n`;
            textePlan += `• Durée : ${nbSemaines} semaines\n`;
            textePlan += `• Séances/semaine : ${seances} (${jours.map((j) => JOURS_SEMAINE[j]).join(", ")})\n`;
            if (secondesObjectif !== null && evaluation) {
                textePlan += `• Temps visé : ${formaterTemps(secondesObjectif)} (${paceFromPct(numVmaSaisie, evaluation.pct)} /km)\n`;
            }
            textePlan += `• Volume max visé : ~${targetKm} km/semaine\n`;
            textePlan += `=========================================\n\n`;

            // Parcours de chaque semaine
            weeks.forEach((w) => {
                const totals = weekTotals(w);
                textePlan += `--- SEMAINE ${w.num} (${WEEK_TYPE_LABEL[w.type].toUpperCase()}) ---\n`;
                textePlan += `Volume : ${totals.km} km | Durée estimée : ${totals.durStr}\n`;
                textePlan += `-----------------------------------------\n`;

                w.sessions.forEach((s, idx) => {
                    textePlan += `  [${s.jour !== undefined ? JOURS_SEMAINE[s.jour] : `Séance ${idx + 1}`}] ${s.label}\n`;
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
                titre="Générateur de plan d'entraînement running personnalisé | RVA"
                description="Téléchargez nos plans d'entraînement de course à pied selon votre niveau et vos objectifs. Préparez votre 10 km, semi-marathon ou marathon."
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
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                            <div>
                                <label htmlFor="inputObjectif" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-600">
                                    Objectif
                                </label>
                                <select
                                    id="inputObjectif"
                                    value={distance}
                                    onChange={(e) => handleDistanceChange(e.target.value as DistanceKey)}
                                    className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none"
                                >
                                    {(Object.keys(DIST_PARAMS) as DistanceKey[]).map((k) => (
                                        <option key={k} value={k}>
                                            {DIST_PARAMS[k].label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="inputTempsRepere" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-600">
                                    Temps repère (10 km)
                                </label>
                                <select
                                    id="inputTempsRepere"
                                    value={category}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none"
                                >
                                    <option value="custom">Selon VMA</option>
                                    <option value="38">Sub 38'</option>
                                    <option value="40">Sub 40'</option>
                                    <option value="42">Sub 42'</option>
                                    <option value="45">Sub 45'</option>
                                    <option value="50">Sub 50'</option>
                                    <option value="55">Sub 55'</option>
                                    <option value="60">Sub 1h</option>
                                </select>
                                <p className="mt-1 text-xs text-club-600">{categoryHint}</p>
                            </div>

                            <div>
                                <label htmlFor="inputVMA" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-600">
                                    VMA (km/h)
                                </label>
                                <input
                                    type="number"
                                    id="inputVMA"
                                    step={0.1}
                                    min={VMA_MIN}
                                    max={VMA_MAX}
                                    value={vma}
                                    onKeyDown={bloqueurToucheInvalide}
                                    onChange={(e) => {
                                        const saisie = nettoyerNombre(e.target.value);
                                        setVma((precedente) => plafonner(saisie, VMA_MAX, precedente));
                                        setErreurVma("");
                                    }}
                                    onBlur={() => setVma((v) => relever(v, VMA_MIN))}
                                    aria-invalid={erreurVma ? true : undefined}
                                    aria-describedby={erreurVma ? "erreurVMA" : undefined}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none ${erreurVma ? "border-red-400" : "border-club-200"}`}
                                />
                                {erreurVma && (
                                    <p id="erreurVMA" className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                        <AlertCircle size={12} className="shrink-0" />
                                        {erreurVma}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="inputAge" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-600">
                                    Tranche d'âge
                                </label>
                                <select
                                    id="inputAge"
                                    value={ageBracket}
                                    onChange={(e) => setAgeBracket(e.target.value as AgeBracket)}
                                    className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none"
                                >
                                    {AGE_BRACKETS.map((b) => (
                                        <option key={b.key} value={b.key}>
                                            {b.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="inputTempsVise" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-600">
                                    Temps visé <span className="normal-case text-[10px] text-club-500">(facultatif)</span>
                                </label>
                                <input
                                    type="text"
                                    id="inputTempsVise"
                                    inputMode="numeric"
                                    placeholder={EXEMPLE_TEMPS_VISE[distance]}
                                    value={objectif}
                                    onChange={(e) => setObjectif(nettoyerTemps(e.target.value))}
                                    onBlur={() => setObjectifTouche(true)}
                                    aria-invalid={afficherErreurObjectif || evaluation?.niveau === "irrealiste" ? true : undefined}
                                    aria-describedby="aideTempsVise"
                                    className={`w-full rounded-lg border px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none ${afficherErreurObjectif || evaluation?.niveau === "irrealiste" ? "border-red-400" : "border-club-200"}`}
                                />
                                <p id="aideTempsVise" className={`mt-1 text-xs ${afficherErreurObjectif ? "text-red-600" : evaluation ? COULEUR_OBJECTIF[evaluation.niveau] : "text-club-600"}`}>
                                    {afficherErreurObjectif
                                        ? erreurObjectif
                                        : evaluation
                                            ? `Allure ${paceFromPct(numVmaSaisie, evaluation.pct)} /km, soit ${Math.round(evaluation.pct * 100)} % de VMA. ${MESSAGE_OBJECTIF[evaluation.niveau]}`
                                            : "Fixe l'allure des séances d'allure spécifique (à partir de 4 séances par semaine)."}
                                </p>
                            </div>

                            <div>
                                <label htmlFor="inputNbrSemaines" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-600">
                                    Nombre de semaines
                                </label>
                                <input
                                    type="number"
                                    id="inputNbrSemaines"
                                    min={NB_SEMAINES_MIN}
                                    max={NB_SEMAINES_MAX}
                                    value={nbSemaines}
                                    onKeyDown={bloqueurToucheInvalideEntier}
                                    onChange={(e) => {
                                        const saisie = nettoyerEntier(e.target.value);
                                        setNbSemaines((precedente) => plafonner(saisie, NB_SEMAINES_MAX, precedente));
                                    }}
                                    onBlur={() => setNbSemaines((n) => relever(n, NB_SEMAINES_MIN))}
                                    className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="inputKmHebdoVise" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-600">
                                    Km hebdo visé <span className="normal-case text-[10px] text-club-500">(en pointe)</span>
                                </label>

                                <input
                                    type="number"
                                    id="inputKmHebdoVise"
                                    min={KM_HEBDO_MIN}
                                    max={KM_HEBDO_MAX}
                                    value={targetKm}
                                    onKeyDown={bloqueurToucheInvalide}
                                    onChange={(e) => {
                                        setTargetKmManual(true);
                                        setTargetKmSaisi(plafonner(nettoyerNombre(e.target.value), KM_HEBDO_MAX, targetKm));
                                    }}
                                    onBlur={() => setTargetKmSaisi((km) => relever(km, KM_HEBDO_MIN))}
                                    className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm font-medium text-club-900 focus:border-club-600 focus:outline-none"
                                />
                                <button type="button" onClick={() => setTargetKmManual(false)} className="mt-1 text-xs font-medium text-accent-700 hover:text-accent-600">
                                    ↺ recalculer la suggestion
                                </button>
                            </div>
                        </div>

                        {/* JOURS D'ENTRAÎNEMENT */}
                        <fieldset className="mt-6">
                            <legend className="mb-1 block text-xs font-semibold uppercase tracking-wide text-club-600">
                                Jours d'entraînement <span className="normal-case text-[10px] text-club-500">({seances} séances / semaine)</span>
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {JOURS_SEMAINE.map((nom, jour) => {
                                    const choisi = jours.includes(jour);
                                    const bloque = choisi ? jours.length <= NB_JOURS_MIN : jours.length >= NB_JOURS_MAX;
                                    return (
                                        <button
                                            key={nom}
                                            type="button"
                                            onClick={() => basculerJour(jour)}
                                            disabled={bloque}
                                            aria-pressed={choisi}
                                            className={`min-w-[3.25rem] rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${choisi ? "border-club-600 bg-club-600 text-white" : "border-club-200 bg-white text-club-700 hover:bg-club-50"}`}
                                        >
                                            {nom.slice(0, 3)}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-1 text-xs text-club-600">
                                De {NB_JOURS_MIN} à {NB_JOURS_MAX} jours, pour garder au moins un jour de repos. Les séances sont placées pour laisser un jour facile entre deux séances exigeantes (fractionné, seuil, sortie longue).
                            </p>
                            {alertesEnchainement.length > 0 && (
                                <ul className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                                    {alertesEnchainement.map((paire) => (
                                        <li key={`${paire[0].jour}-${paire[1].jour}`}>{messageEnchainement(paire)}</li>
                                    ))}
                                </ul>
                            )}
                        </fieldset>

                        {/* CARTE — accès à la méthode (philosophie, repères d'allures, facteur âge) */}
                        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-club-100 bg-club-50 p-4 sm:flex-row sm:items-center">
                            <p className="text-xs leading-relaxed text-club-700">
                                Comment sont calculées les allures ? Pourquoi une semaine allégée sur quatre ? Retrouvez notre philosophie d'entraînement, les repères d'allure et l'effet de l'âge sur les séances de qualité.
                            </p>
                            <button
                                type="button"
                                onClick={() => setModalMethodeOuverte(true)}
                                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-club-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-club-700"
                            >
                                <Lightbulb size={18} />
                                Notre méthode d'entraînement
                            </button>
                        </div>

                        {/* AVERTISSEMENT — pas un coach (toujours visible) */}
                        {planEntrainementJSON.avertissement && (
                            <p
                                className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"
                                dangerouslySetInnerHTML={{ __html: contenuPropre(planEntrainementJSON.avertissement) }}
                            />
                        )}

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button type="button" onClick={handleGenerate} className="rounded-lg bg-accent-600 px-6 py-3 font-medium text-white transition hover:bg-accent-700">
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                                <div>
                                    <span className="text-club-600 block font-medium uppercase">VMA</span>
                                    <span className="font-bold text-club-800 text-sm">{vma} km/h</span>
                                </div>
                                <div>
                                    <span className="text-club-600 block font-medium uppercase">Âge</span>
                                    <span className="font-bold text-club-800 text-sm">{AGE_BRACKETS.find((b) => b.key === ageBracket)?.label ?? ageBracket}</span>
                                </div>
                                <div>
                                    <span className="text-club-600 block font-medium uppercase">Durée</span>
                                    <span className="font-bold text-club-800 text-sm">{nbSemaines} Semaines</span>
                                </div>
                                <div>
                                    <span className="text-club-600 block font-medium uppercase">Fréquence</span>
                                    <span className="font-bold text-club-800 text-sm">{seances} séances / sem.</span>
                                    <span className="block text-club-600">{jours.map((j) => JOURS_SEMAINE[j].slice(0, 3)).join(", ")}</span>
                                </div>
                                {secondesObjectif !== null && evaluation && (
                                    <div>
                                        <span className="text-club-600 block font-medium uppercase">Temps visé</span>
                                        <span className="font-bold text-accent-700 text-sm">{formaterTemps(secondesObjectif)}</span>
                                        <span className="block text-club-600">{paceFromPct(numVmaSaisie, evaluation.pct)} /km</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-club-600 block font-medium uppercase">Volume max</span>
                                    <span className="font-bold text-accent-700 text-sm">~{targetKm} km / sem.</span>
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
                                                    <span className="text-xs uppercase tracking-wide text-white">
                                                        {WEEK_TYPE_LABEL[w.type]} · {WEEK_TYPE_TAG[w.type]}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="font-display text-lg font-bold text-white">{totals.km} km</div>
                                                    <div className="text-xs text-white">{totals.durStr}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                            {w.sessions.map((s, si) => (
                                                <div key={si} className="border-b border-r border-club-100 p-5 last:border-r-0">
                                                    {s.jour !== undefined && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-club-600">{JOURS_SEMAINE[s.jour]}</p>}
                                                    <span className={`mb-2 inline-block rounded-full px-3 py-1 text-[11px] font-medium ${WEEK_TYPE_BADGE[w.type]}`}>{s.label}</span>
                                                    <p className="text-xs leading-relaxed text-club-900/70">{s.desc}</p>
                                                    <p className="mt-3 font-display text-sm font-bold text-accent-700">{s.pace}</p>
                                                    <p className="mt-1 text-xs font-medium text-club-600">{s.vol}</p>
                                                    <p className="mt-2 border-t border-dashed border-club-100 pt-2 text-[11px] text-club-600">{formatMin(s.durationMin)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* MODAL — Notre méthode d'entraînement (philosophie, repères d'allures, facteur âge) */}
                <Modal ouvert={modalMethodeOuverte} titre="Notre méthode d'entraînement" onFermer={() => setModalMethodeOuverte(false)} largeurMax="lg">
                    <div className="space-y-6">
                        {/* PHILOSOPHIE */}
                        {planEntrainementJSON.philosophie && (
                            <section>
                                <h3 className="mb-2 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-accent-700">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-600" />
                                    Notre philosophie
                                </h3>
                                <p
                                    className="text-sm leading-relaxed text-club-700"
                                    dangerouslySetInnerHTML={{ __html: contenuPropre(planEntrainementJSON.philosophie) }}
                                />
                            </section>
                        )}

                        {/* REPÈRES D'ALLURE — tableau */}
                        <section className="border-t border-club-100 pt-5">
                            <h3 className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-club-700">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-club-600" />
                                Repères d'allure (% de VMA)
                            </h3>
                            <div className="overflow-hidden rounded-lg border border-club-100">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-club-50">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold text-club-700">Séance</th>
                                            <th className="px-3 py-2 font-semibold text-club-700 whitespace-nowrap">% VMA</th>
                                            <th className="hidden px-3 py-2 font-semibold text-club-700 sm:table-cell">Repère</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-club-100">
                                        {REPERES_ALLURES.map((r) => (
                                            <tr key={r.kind}>
                                                <td className="px-3 py-2 font-medium text-club-900">{r.label}</td>
                                                <td className="whitespace-nowrap px-3 py-2 font-semibold text-accent-700">
                                                    {Math.round(PACE_PCT[r.kind].min * 100)}–{Math.round(PACE_PCT[r.kind].max * 100)}%
                                                </td>
                                                <td className="hidden px-3 py-2 text-club-600 sm:table-cell">{r.desc}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td className="px-3 py-2 font-medium text-club-900">Allure spécifique</td>
                                            <td className="whitespace-nowrap px-3 py-2 font-semibold text-accent-700">variable</td>
                                            <td className="hidden px-3 py-2 text-club-600 sm:table-cell">Allure visée le jour de la course (voir tableau ci-dessous)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                                ⚠️ Jamais plus de 2 séances d'intensité (seuil / fractionné) par semaine — le reste est EF, récup active ou PPG.
                            </p>
                        </section>

                        {/* RÉPARTITION DANS LA SEMAINE */}
                        <section className="border-t border-club-100 pt-5">
                            <h3 className="mb-2 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-club-700">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-club-600" />
                                Répartition dans la semaine
                            </h3>
                            <p className="text-sm leading-relaxed text-club-700">
                                Les séances exigeantes (fractionné, seuil, allure spécifique et sortie longue) sont espacées d'au moins 48 h, avec un jour de repos ou un footing entre elles. La sortie longue va de préférence le week-end. Si les jours choisis obligent à enchaîner deux séances exigeantes, la séance intense passe avant la sortie longue : celle-ci se court lentement et supporte la fatigue de la veille, alors qu'un fractionné le lendemain d'une sortie longue se fait sur des jambes entamées.
                            </p>
                        </section>

                        {/* ALLURE SPÉCIFIQUE PAR DISTANCE — tableau */}
                        <section className="border-t border-club-100 pt-5">
                            <h3 className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-club-700">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-club-600" />
                                Allure spécifique par distance
                            </h3>
                            <div className="overflow-hidden rounded-lg border border-club-100">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-club-50">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold text-club-700">Distance</th>
                                            <th className="px-3 py-2 font-semibold text-club-700 whitespace-nowrap">% VMA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-club-100">
                                        {(Object.keys(DIST_PARAMS) as DistanceKey[]).map((k) => {
                                            const p = DIST_PARAMS[k];
                                            return (
                                                <tr key={k}>
                                                    <td className="px-3 py-2 font-medium text-club-900">{p.label}</td>
                                                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-accent-700">
                                                        {Math.round(p.allureSpePct[0] * 100)}–{Math.round(p.allureSpePct[1] * 100)}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* FACTEUR ÂGE — tableau */}
                        <section className="border-t border-club-100 pt-5">
                            <h3 className="mb-2 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-club-700">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-club-600" />
                                Facteur âge
                            </h3>
                            <p className="mb-3 text-sm leading-relaxed text-club-700">
                                À VMA égale, la capacité à tenir une intensité élevée diminue avec l'âge. Les allures de <b>seuil, fractionné et allure spécifique</b> sont donc légèrement assouplies. L'<b>EF et la sortie longue</b> ne sont pas concernées, elles restent déjà conservatrices.
                            </p>
                            <div className="overflow-hidden rounded-lg border border-club-100">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-club-50">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold text-club-700">Tranche d'âge</th>
                                            <th className="px-3 py-2 font-semibold text-club-700 whitespace-nowrap">Facteur</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-club-100">
                                        {AGE_BRACKETS.map((b) => (
                                            <tr key={b.key}>
                                                <td className="px-3 py-2 font-medium text-club-900">{b.label}</td>
                                                <td className="whitespace-nowrap px-3 py-2 font-semibold text-accent-700">
                                                    {AGE_PACE_FACTOR[b.key].toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </Modal>
            </div>
        </>
    );
}