// pages/ressources/CategoriesFFA.tsx

import { useEffect, useMemo, useState } from "react";
import SEO from "../../composants/generale/SEO";
import { bloqueurToucheInvalide, nettoyerNombre } from "../../fonctions/nettoyeurNombre";
import { useRequeteJSON } from "../../fonctions/requeteJSON";

interface DonneesJSON {
    titre: string,
    descriptionPartie1: string,
    descriptionPartie2: string,

    titreTableauGeneral: string,
    descriptionTableauGeneralePartie1: string,
    descriptionTableauGeneralePartie2: string,
    titreTableauMaster: string
}

const DONNEES_PAR_DEFAUT: DonneesJSON = {
    titre: "Catégorie d'âge FFA",
    descriptionPartie1: "Renseigne ton année de naissance pour connaître ta catégorie d'âge FFA. Valable jusqu'au 31 août ",
    descriptionPartie2: "— les catégories changeront le 1er septembre ",

    titreTableauGeneral: "Les catégories d'âge ",
    descriptionTableauGeneralePartie1: "Valable jusqu'au 31 août ",
    descriptionTableauGeneralePartie2: ", ces catégories changeront le 1er septembre ",
    titreTableauMaster: "Détail des catégories Masters"
}


/* ------------------------------------------------------------------ */
/*  Calcul de l'année de référence de la saison FFA en cours.         */
/*  La saison va du 1er septembre (année N) au 31 août (année N+1).   */
/*  La catégorie change chaque 1er septembre.                         */
/*  → si on est entre janvier et août : année de référence = année N  */
/*  → si on est entre septembre et décembre : année de référence = N+1 */
/* ------------------------------------------------------------------ */
function calculerAnneeReference(date: Date = new Date()): number {
    const mois = date.getMonth() + 1; // getMonth() est 0-indexé
    const annee = date.getFullYear();
    return mois >= 9 ? annee + 1 : annee;
}

interface CategorieGenerale {
    code: string;
    label: string;
    /** décalage (en nombre d'années avant l'année de référence) du BORNE la plus ancienne ; undefined = pas de limite basse (ex : Masters) */
    decalageMax?: number;
    /** décalage (en nombre d'années avant l'année de référence) du BORNE la plus récente ; undefined = pas de limite haute (ex : Baby Athlé) */
    decalageMin?: number;
}

interface CategorieMasters {
    code: string;
    decalageMax?: number;
    decalageMin?: number;
}

/* Les décalages ci-dessous sont fixes (ils correspondent aux écarts d'âge
   officiels FFA) — seule l'année de référence change chaque saison. */
const DEFINITIONS_CATEGORIES: CategorieGenerale[] = [
    { code: "MA", label: "Masters", decalageMin: 35 },
    { code: "SE", label: "Seniors", decalageMax: 34, decalageMin: 23 },
    { code: "ES", label: "U23 / Espoirs", decalageMax: 22, decalageMin: 20 },
    { code: "JU", label: "U20 / Juniors", decalageMax: 19, decalageMin: 18 },
    { code: "CA", label: "U18 / Cadets", decalageMax: 17, decalageMin: 16 },
    { code: "MI", label: "U16 / Minimes", decalageMax: 15, decalageMin: 14 },
    { code: "BE", label: "U14 / Benjamins", decalageMax: 13, decalageMin: 12 },
    { code: "PO", label: "U12 / Poussins", decalageMax: 11, decalageMin: 10 },
    { code: "EA", label: "Éveil Athlétique", decalageMax: 9, decalageMin: 7 },
    { code: "BB", label: "Baby Athlé", decalageMax: 6 },
];

const DEFINITIONS_MASTERS: CategorieMasters[] = [
    { code: "M0", decalageMax: 39, decalageMin: 35 },
    { code: "M1", decalageMax: 44, decalageMin: 40 },
    { code: "M2", decalageMax: 49, decalageMin: 45 },
    { code: "M3", decalageMax: 54, decalageMin: 50 },
    { code: "M4", decalageMax: 59, decalageMin: 55 },
    { code: "M5", decalageMax: 64, decalageMin: 60 },
    { code: "M6", decalageMax: 69, decalageMin: 65 },
    { code: "M7", decalageMax: 74, decalageMin: 70 },
    { code: "M8", decalageMax: 79, decalageMin: 75 },
    { code: "M9", decalageMax: 84, decalageMin: 80 },
    { code: "M10", decalageMin: 85 },
];

function formatPlage(anneeMin?: number, anneeMax?: number): string {
    if (anneeMin === undefined && anneeMax === undefined) return "-";
    if (anneeMin === undefined) return `${anneeMax} et avant`;
    if (anneeMax === undefined) return `${anneeMin} et après`;
    if (anneeMin === anneeMax) return `${anneeMin}`;
    return `${anneeMin} à ${anneeMax}`;
}

function estDansLaPlage(annee: number, anneeMin?: number, anneeMax?: number): boolean {
    if (anneeMin !== undefined && annee < anneeMin) return false;
    if (anneeMax !== undefined && annee > anneeMax) return false;
    return true;
}

export default function CategoriesFFA() {
    const [anneeSaisie, setAnneeSaisie] = useState<string>("");
    const [categoriesFFA, setCategoriesFFA] = useState<DonneesJSON>(DONNEES_PAR_DEFAUT)

    const requeteJSON = useRequeteJSON()

    const anneeReference = useMemo(() => calculerAnneeReference(), []);

    // Catégories générales avec leurs bornes en années calendaires (dérivées de l'année de référence)
    const categoriesGenerales = useMemo(() => {
        return DEFINITIONS_CATEGORIES.map((def) => ({
            ...def,
            anneeMin: def.decalageMax !== undefined ? anneeReference - def.decalageMax : undefined,
            anneeMax: def.decalageMin !== undefined ? anneeReference - def.decalageMin : undefined,
        }));
    }, [anneeReference]);

    const categoriesMasters = useMemo(() => {
        return DEFINITIONS_MASTERS.map((def) => ({
            ...def,
            anneeMin: def.decalageMax !== undefined ? anneeReference - def.decalageMax : undefined,
            anneeMax: def.decalageMin !== undefined ? anneeReference - def.decalageMin : undefined,
        }));
    }, [anneeReference]);

    const anneeNum = parseInt(anneeSaisie, 10);
    const anneeValide = anneeSaisie !== "" && !isNaN(anneeNum) && anneeNum > 1900 && anneeNum <= anneeReference;

    const categorieTrouvee = useMemo(() => {
        if (!anneeValide) return null;
        return categoriesGenerales.find((c) => estDansLaPlage(anneeNum, c.anneeMin, c.anneeMax)) ?? null;
    }, [anneeValide, anneeNum, categoriesGenerales]);

    const masterTrouve = useMemo(() => {
        if (!categorieTrouvee || categorieTrouvee.code !== "MA") return null;
        return categoriesMasters.find((c) => estDansLaPlage(anneeNum, c.anneeMin, c.anneeMax)) ?? null;
    }, [categorieTrouvee, anneeNum, categoriesMasters]);


    useEffect(() => {
        async function chargerPage() {
            const texteCacheInitial = await requeteJSON("ressources/categories-ffa", (nouvellesDonnees) => {
                if (nouvellesDonnees) {
                    setCategoriesFFA((prev) => ({ ...prev, ...nouvellesDonnees }));
                }
            });

            if (texteCacheInitial) {
                setCategoriesFFA((prev) => ({ ...prev, ...texteCacheInitial }));
            }
        }

        chargerPage();
    }, []);

    return (
        <>
            <SEO
                titre="Catégories d'âge FFA — Running Vincennes Association"
                description="Trouvez votre catégorie d'âge FFA (Fédération Française d'Athlétisme) à partir de votre année de naissance : Seniors, Espoirs, Juniors, Masters..."
                chemin="/ressources/categories-ffa"
            />
            <div className="font-body text-club-900 mx-auto max-w-6xl px-6 py-12">
                <header>
                    <h1 className="mt-1 font-display text-3xl font-bold text-club-600 md:text-4xl">{categoriesFFA.titre}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-club-900/75">
                        {categoriesFFA.descriptionPartie1}{anneeReference}
                        {" "}{categoriesFFA.descriptionPartie2}{anneeReference}.
                    </p>
                </header>

                {/* Saisie année de naissance */}
                <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-club-100 bg-club-50 p-6">
                    <label htmlFor="anneeNaissance" className="text-sm font-medium text-club-700">
                        Année de naissance
                    </label>
                    <input
                        id="anneeNaissance"
                        type="text"
                        inputMode="numeric"
                        placeholder="ex : 1998"
                        onKeyDown={bloqueurToucheInvalide}
                        value={anneeSaisie}
                        onChange={(e) => setAnneeSaisie(nettoyerNombre(e.target.value))}
                        className="w-32 rounded-lg border border-club-200 bg-white px-3 py-2 text-center font-semibold text-club-700 outline-none focus:border-club-600"
                    />

                    {anneeSaisie !== "" && !anneeValide && (
                        <span className="text-sm text-accent-700">Merci d'entrer une année valide.</span>
                    )}
                </div>

                {/* Résultat */}
                {categorieTrouvee && (
                    <div className="mt-6 rounded-2xl border-2 border-club-600 bg-club-600 p-6 text-center">
                        <p className="text-sm font-medium text-white/80">Ta catégorie</p>
                        <p className="mt-1 font-display text-2xl font-bold text-white">
                            {categorieTrouvee.label} {masterTrouve ? `— ${masterTrouve.code}` : `(${categorieTrouvee.code})`}
                        </p>
                    </div>
                )}

                {/* Tableau des catégories générales */}
                <div className="mt-10">
                    <h2 className="font-display text-xl font-semibold text-club-600">{categoriesFFA.titreTableauGeneral}{anneeReference}</h2>
                    <p className="mt-1 text-xs text-club-400">
                        {categoriesFFA.descriptionTableauGeneralePartie1}{anneeReference}{categoriesFFA.descriptionTableauGeneralePartie2}{anneeReference}.
                    </p>
                    <div className="mt-4 overflow-hidden rounded-xl border border-club-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-club-50 text-club-700">
                                <tr>
                                    <th className="px-4 py-3 font-display font-semibold">Catégorie</th>
                                    <th className="px-4 py-3 font-display font-semibold">Code</th>
                                    <th className="px-4 py-3 font-display font-semibold">Année de naissance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categoriesGenerales.map((cat) => {
                                    const active = categorieTrouvee?.code === cat.code;
                                    return (
                                        <tr
                                            key={cat.code}
                                            className={`border-t border-club-100 ${active ? "bg-accent-500/10" : "bg-white"}`}
                                        >
                                            <td className={`px-4 py-3 ${active ? "font-semibold text-accent-700" : "text-club-900"}`}>{cat.label}</td>
                                            <td className={`px-4 py-3 ${active ? "font-semibold text-accent-700" : "text-club-400"}`}>{cat.code}</td>
                                            <td className={`px-4 py-3 ${active ? "font-semibold text-accent-700" : "text-club-900/80"}`}>
                                                {formatPlage(cat.anneeMin, cat.anneeMax)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Détail des catégories Masters */}
                <div className="mt-10">
                    <h2 className="font-display text-xl font-semibold text-club-600">{categoriesFFA.titreTableauMaster}</h2>
                    <div className="mt-4 overflow-hidden rounded-xl border border-club-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-club-50 text-club-700">
                                <tr>
                                    <th className="px-4 py-3 font-display font-semibold">Catégorie</th>
                                    <th className="px-4 py-3 font-display font-semibold">Code</th>
                                    <th className="px-4 py-3 font-display font-semibold">Année de naissance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categoriesMasters.map((cat) => {
                                    const active = masterTrouve?.code === cat.code;
                                    return (
                                        <tr
                                            key={cat.code}
                                            className={`border-t border-club-100 ${active ? "bg-accent-500/10" : "bg-white"}`}
                                        >
                                            <td className={`px-4 py-3 ${active ? "font-semibold text-accent-700" : "text-club-900"}`}>Masters H et F</td>
                                            <td className={`px-4 py-3 ${active ? "font-semibold text-accent-700" : "text-club-400"}`}>{cat.code}</td>
                                            <td className={`px-4 py-3 ${active ? "font-semibold text-accent-700" : "text-club-900/80"}`}>
                                                {formatPlage(cat.anneeMin, cat.anneeMax)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}