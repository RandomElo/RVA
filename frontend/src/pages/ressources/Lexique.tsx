/**
 * Page Lexique — glossaire des termes de la course à pied.
 * Contenu piloté par le JSON (../../public/textes/ressources/lexique.json).
 */

import { useEffect, useMemo, useState } from "react";
import { Gauge, HeartPulse, Dumbbell, Apple, Footprints, ShoppingBag, Search, X, BookOpen } from "lucide-react";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import SEO from "../../composants/generale/SEO";

const NB_SLOTS = 100;

type TermeLexique = {
    terme: string;
    definition: string;
};

type GroupeCategorie = {
    categorie: string;
    termes: TermeLexique[];
};

// Icônes associées aux catégories connues
const ICONES_PAR_CATEGORIE: Record<string, typeof Gauge> = {
    allures: Gauge,
    physiologie: HeartPulse,
    entrainement: Dumbbell,
    nutrition: Apple,
    technique: Footprints,
    materiel: ShoppingBag,
};

const DONNEES_PAR_DEFAULT = {
    badge: "Le vocabulaire du coureur",
    titre: "Lexique de la course à pied",
    description: "Allures, entraînement, nutrition, technique, matériel… tous les termes qu'on entend au club, expliqués simplement.",
    placeholderRecherche: "Rechercher un terme (ex : VMA, fartlek, drop…)",
    labelToutes: "Toutes",
    messageAucunResultat: "Aucun terme ne correspond à « {recherche} »",
    sousMessageAucunResultat: "Essayez un autre mot-clé, ou parcourez une catégorie ci-dessus.",
    categorieTerme1: "Allures",
    terme1: "Allure",
    definitionTerme1: "Vitesse de course, exprimée en temps par kilomètre (ex : 5'00/km).",
    categorieTerme2: "Allures",
    terme2: "Allure endurance fondamentale",
    definitionTerme2: "Allure lente et confortable, sans essoufflement, pour développer l'endurance de base (~65-75% FCmax).",
    categorieTerme3: "Allures",
    terme3: "Allure marathon (@AS42)",
    definitionTerme3: "Vitesse cible pour tenir tout un marathon.",
    categorieTerme4: "Allures",
    terme4: "Allure semi marathon (@AS21)",
    definitionTerme4: "Vitesse cible pour tenir tout un semi-marathon.",
    categorieTerme5: "Allures",
    terme5: "Allure 10 km (@AS10)",
    definitionTerme5: "Vitesse cible pour une course de 10 km.",
    categorieTerme6: "Allures",
    terme6: "Allure 5 km (@AS5)",
    definitionTerme6: "Vitesse cible pour une course de 5 km.",
    categorieTerme7: "Allures",
    terme7: "Seuil",
    definitionTerme7: "Allure soutenue, à la limite où le lactate commence à s'accumuler plus vite qu'il n'est éliminé.",
    categorieTerme8: "Allures",
    terme8: "Allure aisée",
    definitionTerme8: "Allure confortable où l'on peut parler sans être essoufflé.",
    categorieTerme9: "Allures",
    terme9: "Aérobie faible",
    definitionTerme9: "Effort facile où le corps utilise principalement l'oxygène pour produire de l'énergie. C'est l'intensité de l'endurance fondamentale, idéale pour développer l'endurance et récupérer. Durée possible : plusieurs heures.",
    categorieTerme10: "Allures",
    terme10: "Aérobie élevée",
    definitionTerme10: "Effort soutenu où l'oxygène reste la principale source d'énergie, mais le cœur et les muscles travaillent beaucoup plus. Cette zone améliore les performances sur les longues distances. Durée possible : 20 min à 1 h.",
    categorieTerme11: "Allures",
    terme11: "Anaérobie",
    definitionTerme11: "Effort très intense où le corps ne peut plus produire suffisamment d'énergie avec l'oxygène seul. Il utilise alors d'autres mécanismes qui entraînent une accumulation rapide de fatigue. Utilisée pour les sprints et intervalles courts. Durée possible : quelques secondes à quelques minutes.",
    categorieTerme12: "Allures",
    terme12: "Négative split",
    definitionTerme12: "Stratégie de course : terminer plus vite que l'on a commencé.",
    categorieTerme13: "Allures",
    terme13: "Fractionné (allure)",
    definitionTerme13: "Alternance de portions rapides et lentes sur une même séance.",
    categorieTerme14: "Allures",
    terme14: "Split",
    definitionTerme14: "Temps intermédiaire enregistré à chaque kilomètre ou fraction de course.",
    categorieTerme15: "Allures",
    terme15: "Record personnel (RP/PB)",
    definitionTerme15: "Meilleure performance chronométrique réalisée par un coureur sur une distance donnée.",
    categorieTerme16: "Allures",
    terme16: "Progressif",
    definitionTerme16: "Séance ou course où l'allure augmente graduellement du début à la fin.",
    categorieTerme17: "Allures",
    terme17: "Temps de passage",
    definitionTerme17: "Chronomètre relevé à un point précis du parcours (ex : 10 km, mi-course).",
    categorieTerme18: "Physiologie",
    terme18: "VMA",
    definitionTerme18: "Vitesse Maximale Aérobie : vitesse à laquelle le corps consomme un maximum d'oxygène.",
    categorieTerme19: "Physiologie",
    terme19: "VO2 Max",
    definitionTerme19: "Volume maximal d'oxygène que le corps peut utiliser par minute à l'effort intense.",
    categorieTerme20: "Physiologie",
    terme20: "FC max",
    definitionTerme20: "Fréquence cardiaque maximale : nombre de battements par minute le plus élevé atteignable.",
    categorieTerme21: "Physiologie",
    terme21: "Lactate",
    definitionTerme21: "Substance produite par les muscles à l'effort intense, responsable de la fatigue en excès.",
    categorieTerme22: "Physiologie",
    terme22: "Economie de course",
    definitionTerme22: "Quantité d'énergie dépensée pour courir à une vitesse donnée : meilleure économie = moins de fatigue.",
    categorieTerme23: "Physiologie",
    terme23: "Cadence",
    definitionTerme23: "Nombre de pas effectués par minute.",
    categorieTerme24: "Physiologie",
    terme24: "Foulée",
    definitionTerme24: "Distance parcourue entre deux appuis du même pied.",
    categorieTerme25: "Physiologie",
    terme25: "FC repos",
    definitionTerme25: "Fréquence cardiaque au repos, un bon indicateur de forme générale.",
    categorieTerme26: "Physiologie",
    terme26: "Seuil aérobie",
    definitionTerme26: "Intensité où l'effort reste majoritairement alimenté par l'oxygène, sans accumulation de lactate.",
    categorieTerme27: "Physiologie",
    terme27: "Fibres musculaires",
    definitionTerme27: "Types de fibres : lentes = endurance, rapides = puissance/vitesse.",
    categorieTerme28: "Physiologie",
    terme28: "Seuil anaérobie",
    definitionTerme28: "Intensité au-delà de laquelle le lactate s'accumule rapidement dans le sang.",
    categorieTerme29: "Physiologie",
    terme29: "Courbatures (DOMS)",
    definitionTerme29: "Douleurs musculaires apparaissant 24 à 48h après un effort inhabituel ou intense.",
    categorieTerme30: "Entraînement",
    terme30: "Sortie longue",
    definitionTerme30: "Course d'endurance prolongée pour habituer le corps à l'effort long.",
    categorieTerme31: "Entraînement",
    terme31: "Footing",
    definitionTerme31: "Course facile à allure modérée, souvent en récupération.",
    categorieTerme32: "Entraînement",
    terme32: "Séance qualité",
    definitionTerme32: "Entraînement intense et spécifique pour progresser en vitesse ou en endurance.",
    categorieTerme33: "Entraînement",
    terme33: "Fartlek",
    definitionTerme33: "« Jeu d'allure » : alternance libre de phases rapides et lentes.",
    categorieTerme34: "Entraînement",
    terme34: "Tempo",
    definitionTerme34: "Séance à allure soutenue mais contrôlée, proche du seuil.",
    categorieTerme35: "Entraînement",
    terme35: "Retour au calme",
    definitionTerme35: "Course très lente en fin de séance pour aider la récupération.",
    categorieTerme36: "Entraînement",
    terme36: "Affûtage",
    definitionTerme36: "Réduction progressive du volume d'entraînement avant une course, pour arriver reposé.",
    categorieTerme37: "Entraînement",
    terme37: "Côtes",
    definitionTerme37: "Répétitions en montée pour développer la puissance musculaire.",
    categorieTerme38: "Entraînement",
    terme38: "Récupération active",
    definitionTerme38: "Effort très léger (marche, footing lent) pour favoriser la récupération sans être totalement immobile.",
    categorieTerme39: "Entraînement",
    terme39: "Surentraînement",
    definitionTerme39: "État de fatigue excessive causé par un excès d'entraînement sans récupération suffisante.",
    categorieTerme40: "Entraînement",
    terme40: "Sortie de récupération",
    definitionTerme40: "Footing très facile réalisé au lendemain d'une séance intense pour favoriser la récupération.",
    categorieTerme41: "Nutrition",
    terme41: "Glucides",
    definitionTerme41: "Nutriments qui fournissent l'énergie rapide aux muscles.",
    categorieTerme42: "Nutrition",
    terme42: "Glycogène",
    definitionTerme42: "Réserve de glucides stockée dans les muscles et le foie, utilisée comme carburant.",
    categorieTerme43: "Nutrition",
    terme43: "Protéines",
    definitionTerme43: "Nutriments essentiels à la réparation et à la reconstruction musculaire après l'effort.",
    categorieTerme44: "Nutrition",
    terme44: "Électrolytes",
    definitionTerme44: "Sels minéraux (sodium, potassium, magnésium) perdus dans la sueur, à réapprovisionner à l'effort.",
    categorieTerme45: "Nutrition",
    terme45: "Gel énergétique",
    definitionTerme45: "Sachet de gel sucré consommé pendant l'effort pour un apport rapide en énergie.",
    categorieTerme46: "Nutrition",
    terme46: "Boisson isotonique",
    definitionTerme46: "Boisson (eau + sucres + sels minéraux) absorbée rapidement pour hydrater et énergiser.",
    categorieTerme47: "Nutrition",
    terme47: "Hydratation",
    definitionTerme47: "Apport en eau nécessaire avant, pendant et après l'effort.",
    categorieTerme48: "Nutrition",
    terme48: "Charge en glucides",
    definitionTerme48: "Stratégie alimentaire avant une course longue pour maximiser les réserves de glycogène.",
    categorieTerme49: "Technique",
    terme49: "Attaque du pied",
    definitionTerme49: "Partie du pied qui touche le sol en premier (talon, médio-pied, avant-pied).",
    categorieTerme50: "Technique",
    terme50: "Pronation",
    definitionTerme50: "Mouvement naturel du pied qui s'incline vers l'intérieur à la réception.",
    categorieTerme51: "Technique",
    terme51: "Supination",
    definitionTerme51: "Mouvement du pied qui s'incline vers l'extérieur à la réception.",
    categorieTerme52: "Technique",
    terme52: "Foulée médio-pied",
    definitionTerme52: "Foulée où le pied touche le sol par son milieu.",
    categorieTerme53: "Technique",
    terme53: "Foulée avant-pied",
    definitionTerme53: "Foulée où le pied touche le sol par l'avant (plante/orteils).",
    categorieTerme54: "Technique",
    terme54: "Amplitude",
    definitionTerme54: "Longueur de la foulée.",
    categorieTerme55: "Technique",
    terme55: "Gainage",
    definitionTerme55: "Renforcement des muscles profonds (abdos, dos) pour stabiliser la posture de course.",
    categorieTerme56: "Technique",
    terme56: "Oscillation verticale",
    definitionTerme56: "Mouvement de rebond vertical du corps à chaque foulée.",
    categorieTerme57: "Technique",
    terme57: "Temps de contact au sol",
    definitionTerme57: "Durée pendant laquelle le pied reste posé au sol à chaque appui.",
    categorieTerme58: "Matériel",
    terme58: "Drop",
    definitionTerme58: "Différence de hauteur entre le talon et l'avant du pied dans une chaussure.",
    categorieTerme59: "Matériel",
    terme59: "Amorti",
    definitionTerme59: "Capacité d'une chaussure à absorber les chocs à chaque foulée.",
    categorieTerme60: "Matériel",
    terme60: "Plaque carbone",
    definitionTerme60: "Fine lame de carbone insérée dans la semelle pour restituer de l'énergie et propulser la foulée.",
    categorieTerme61: "Matériel",
    terme61: "Plaque nylon",
    definitionTerme61: "Plaque plus souple que le carbone, offrant stabilité et un léger effet de propulsion.",
    categorieTerme62: "Matériel",
    terme62: "Plaque TPU",
    definitionTerme62: "Plaque en plastique technique (polyuréthane thermoplastique), rigide mais moins réactive que le carbone.",
    categorieTerme63: "Matériel",
    terme63: "Chaussure de course sur route",
    definitionTerme63: "Modèle polyvalent conçu pour l'asphalte, avec amorti adapté à l'entraînement quotidien.",
    categorieTerme64: "Matériel",
    terme64: "Chaussure de compétition (racing)",
    definitionTerme64: "Chaussure légère et réactive, souvent avec plaque, destinée aux courses et séances rapides.",
    categorieTerme65: "Matériel",
    terme65: "Chaussure de trail",
    definitionTerme65: "Chaussure avec semelle crantée et protection renforcée pour terrains accidentés.",
    categorieTerme66: "Matériel",
    terme66: "Chaussure minimaliste",
    definitionTerme66: "Chaussure très légère, drop faible ou nul, pour favoriser une foulée naturelle.",
    categorieTerme67: "Matériel",
    terme67: "Chaussure maximaliste",
    definitionTerme67: "Chaussure à semelle très épaisse offrant un amorti maximal.",
    categorieTerme68: "Matériel",
    terme68: "Chaussure stable",
    definitionTerme68: "Chaussure conçue pour limiter la pronation excessive du pied.",
    categorieTerme69: "Matériel",
    terme69: "Chaussure neutre",
    definitionTerme69: "Chaussure sans correction, adaptée aux foulées équilibrées.",
    categorieTerme70: "Matériel",
    terme70: "Semelle",
    definitionTerme70: "Partie inférieure de la chaussure en contact avec le sol, assure amorti et adhérence.",
    categorieTerme71: "Matériel",
    terme71: "Tige",
    definitionTerme71: "Partie supérieure de la chaussure qui enveloppe le pied.",
    categorieTerme72: "Matériel",
    terme72: "Mousse (EVA/PEBA)",
    definitionTerme72: "Matériau de la semelle intermédiaire ; le PEBA est plus léger et réactif que l'EVA classique.",
    categorieTerme73: "Matériel",
    terme73: "Montre GPS",
    definitionTerme73: "Montre connectée qui mesure la vitesse, la distance et la fréquence cardiaque via satellite.",
    categorieTerme74: "Matériel",
    terme74: "Ceinture de course",
    definitionTerme74: "Accessoire porté à la taille pour transporter gels, téléphone ou flasques.",
    categorieTerme75: "Matériel",
    terme75: "Flasque",
    definitionTerme75: "Petite bouteille souple pour transporter de l'eau ou une boisson isotonique pendant l'effort.",
    categorieTerme76: "Matériel",
    terme76: "Manchons de compression",
    definitionTerme76: "Vêtements serrés (mollets, cuisses) censés améliorer la circulation et réduire la fatigue musculaire.",
}

function icôneDeCategorie(categorie: string): typeof Gauge {
    const cle = categorie
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Supprime les accents pour matcher entrainement/materiel

    return ICONES_PAR_CATEGORIE[cle] ?? BookOpen;
}

/**
 * Reconstruit la liste des catégories (dans l'ordre de première apparition)
 * à partir des clés à plat categorieTermeN / termeN / definitionTermeN.
 */
function construireCategories(json: Record<string, string> | null): GroupeCategorie[] {
    if (!json) return [];

    const ordreCategories: string[] = [];
    const parCategorie = new Map<string, TermeLexique[]>();

    for (let i = 1; i <= NB_SLOTS; i++) {
        const terme = json[`terme${i}`];
        const definition = json[`definitionTerme${i}`] ?? "";
        const categorie = json[`categorieTerme${i}`];

        if (!terme || terme.trim() === "") {
            continue; // slot non défini, on passe
        }

        const cle = categorie && categorie.trim() !== "" ? categorie.trim() : "Autres";

        if (!parCategorie.has(cle)) {
            parCategorie.set(cle, []);
            ordreCategories.push(cle);
        }

        parCategorie.get(cle)!.push({
            terme: terme.trim(),
            definition: definition.trim()
        });
    }

    return ordreCategories.map((categorie) => ({
        categorie,
        termes: parCategorie.get(categorie)!,
    }));
}

export default function Lexique() {
    const [recherche, setRecherche] = useState("");
    const [categorieActive, setCategorieActive] = useState<string>("toutes");
    const [lexiqueJSON, setLexiqueJSON] = useState<Record<string, string> | null>(DONNEES_PAR_DEFAULT);

    const requeteJSON = useRequeteJSON();

    useEffect(() => {

        async function recuperation() {
            const donnees = await requeteJSON("ressources/lexique", (nouvellesDonnees) => {
                if (nouvellesDonnees) setLexiqueJSON(nouvellesDonnees)
            });
            if (donnees) setLexiqueJSON(donnees);
        }
        recuperation();
    }, []);

    // 1. Découpage du JSON en catégories structurées (Mémoïsé)
    const CATEGORIES = useMemo(() => {
        return construireCategories(lexiqueJSON);
    }, [lexiqueJSON]);

    const requeteNormalisee = recherche.trim().toLocaleLowerCase("fr-FR");

    // 2. Filtrage des termes en fonction de la catégorie active et de la recherche
    const categoriesAffichees = useMemo(() => {
        return CATEGORIES
            .filter((groupe) => categorieActive === "toutes" || groupe.categorie === categorieActive)
            .map((groupe) => {
                const termes = groupe.termes.filter((t) => {
                    if (!requeteNormalisee) return true;
                    return (
                        t.terme.toLocaleLowerCase("fr-FR").includes(requeteNormalisee) ||
                        t.definition.toLocaleLowerCase("fr-FR").includes(requeteNormalisee)
                    );
                });
                return { categorie: groupe.categorie, termes };
            })
            .filter((groupe) => groupe.termes.length > 0);
    }, [CATEGORIES, categorieActive, requeteNormalisee]);

    const nbResultats = categoriesAffichees.reduce((total, g) => total + g.termes.length, 0);

    // Écran de chargement/Attente si le JSON n'est pas prêt
    if (!lexiqueJSON) {
        return null;
    }

    const messageAucunResultat = (
        lexiqueJSON.messageAucunResultat || "Aucun terme ne correspond à « {recherche} »"
    ).replace("{recherche}", recherche);

    return (
        <>
            <SEO
                titre="Lexique & Vocabulaire de la Course à Pied — Running Vincennes Association"
                description="VMA, Fartlek, PPG, Seuil, SL, EF... Découvrez le dictionnaire complet du vocabulaire de la course à pied pour tout comprendre au jargon running."
                chemin="/ressources/lexique"
            />
            <div className="font-body text-club-900 conteneurPage">
                {/* HERO */}
                <section className="relative overflow-hidden bg-club-600">
                    <div className="mx-auto max-w-4xl px-6 py-16 text-center md:py-20">
                        {lexiqueJSON.badge && (
                            <span className="inline-block rounded-full bg-club-400/30 px-4 py-1 text-sm font-medium text-club-50">
                                {lexiqueJSON.badge}
                            </span>
                        )}
                        <h1 className="mt-5 font-display text-3xl font-bold leading-tight text-white md:text-4xl">
                            {lexiqueJSON.titre}
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-club-100 md:text-base">
                            {lexiqueJSON.description}
                        </p>
                    </div>
                </section>

                {/* RECHERCHE + FILTRES */}
                <section className="sticky top-0 z-10 border-b border-club-100 bg-white/95 backdrop-blur">
                    <div className="mx-auto max-w-6xl px-6 py-5">
                        <div className="relative">
                            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-club-600" />
                            <input
                                type="text"
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                                placeholder={lexiqueJSON.placeholderRecherche ?? "Rechercher un terme..."}
                                className="w-full rounded-lg border border-club-200 bg-club-50/60 py-3 pl-11 pr-11 text-sm text-club-900 outline-none transition focus:border-club-600 focus:bg-white"
                            />
                            {recherche && (
                                <button
                                    type="button"
                                    onClick={() => setRecherche("")}
                                    aria-label="Effacer la recherche"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-club-600 transition hover:bg-club-50 hover:text-club-700"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setCategorieActive("toutes")}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${categorieActive === "toutes"
                                    ? "bg-club-600 text-white"
                                    : "bg-club-50 text-club-700 hover:bg-club-100"
                                    }`}
                            >
                                {lexiqueJSON.labelToutes ?? "Toutes"}
                            </button>

                            {CATEGORIES.map((groupe) => {
                                const Icone = icôneDeCategorie(groupe.categorie);
                                const active = categorieActive === groupe.categorie;

                                return (
                                    <button
                                        key={groupe.categorie}
                                        type="button"
                                        onClick={() => setCategorieActive(groupe.categorie)}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${active
                                            ? "bg-club-600 text-white"
                                            : "bg-club-50 text-club-700 hover:bg-club-100"
                                            }`}
                                    >
                                        <Icone size={14} />
                                        {groupe.categorie}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* RÉSULTATS */}
                <section className="mx-auto max-w-6xl px-6 py-12">
                    {nbResultats === 0 ? (
                        <div className="rounded-xl border border-dashed border-club-200 bg-club-50/60 px-6 py-16 text-center">
                            <p className="font-display text-lg font-semibold text-club-700">{messageAucunResultat}</p>
                            <p className="mt-2 text-sm text-club-900/70">{lexiqueJSON.sousMessageAucunResultat}</p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {categoriesAffichees.map(({ categorie, termes }) => {
                                const Icone = icôneDeCategorie(categorie);

                                return (
                                    <div key={categorie} id={categorie}>
                                        <div className="flex items-center gap-2 border-b border-club-100 pb-3">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-club-50 text-club-600">
                                                <Icone size={16} />
                                            </span>
                                            <h2 className="font-display text-xl font-semibold text-club-600">{categorie}</h2>
                                            <span className="ml-1 text-xs font-medium text-club-600">({termes.length})</span>
                                        </div>

                                        <dl className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {termes.map((t, idx) => (
                                                <div key={`${t.terme}-${idx}`} className="rounded-xl border border-club-100 bg-white p-5 transition hover:border-club-200 hover:shadow-sm">
                                                    <dt className="font-display text-sm font-semibold text-club-700">{t.terme}</dt>
                                                    <dd className="mt-1.5 text-sm leading-relaxed text-club-900/75">{t.definition}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}