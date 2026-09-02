import { useEffect, useMemo, useState } from "react";
import { Info, Plus, Search, X, Gauge, Trophy, Sparkles, Road, Mountain } from "lucide-react";
import { useRequete } from "../fonctions/requete";
import ModalNouvelleCourse from "../composants/modal/calendrier/ModalNouvelleCourse";
import {
    type ObjetInteressementAdherent,
    type Course,
    type EtatInteressementUtilisateur
} from "../constantes/types/calendrier";
import { useAuth } from "../contexts/AuthContext";
import { useRequeteJSON } from "../fonctions/requeteJSON";
import SEO from "../composants/generale/SEO";
import EtatInteressementAdherent from "../composants/calendrier/EtatInteressementAdherent";
import ModalListePersonnesInteresser from "../composants/modal/calendrier/ModalListePersonnesInteresser";
import type { Role } from "../constantes/types/auth";

interface CalendrierJSON {
    titre: string;
    introduction: string;
}

const TYPE_STYLES: Record<Course["type"], string> = {
    "5km": "bg-club-50 text-club-700",
    "10km": "bg-club-50 text-club-700",
    Semi: "bg-club-50 text-club-700",
    Marathon: "bg-accent-100 text-accent-700",
    Route: "bg-club-50 text-club-700",
    Trail: "bg-club-50 text-club-700",
};

// Icônes adaptées aux types de course
const ICONES_TYPES_COURSE: Record<string, typeof Gauge> = {
    "5km": Gauge,
    "10km": Gauge,
    Semi: Trophy,
    Marathon: Trophy,
    Route: Road,
    Trail: Mountain,
};

const MOIS_ABREGES = [
    "JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN",
    "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."
];

const DONNEES_JSON_PAR_DEFAUT = {
    titre: "Calendrier des courses",
    introduction: "Toutes les courses prévues cette saison par les membres du club. Rejoignez le groupe WhatsApp dédié pour covoiturer, s'organiser et courir ensemble le jour J."
};

function parseISOToLocalDate(dateISO: string): Date {
    const dateOnly = dateISO.split("T")[0];
    const [year, month, day] = dateOnly.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formaterJourMois(dateISO: string) {
    const date = parseISOToLocalDate(dateISO);
    return {
        jour: String(date.getDate()).padStart(2, "0"),
        mois: MOIS_ABREGES[date.getMonth()],
    };
}

function formaterDateComplete(dateISO: string) {
    const date = parseISOToLocalDate(dateISO).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return date.charAt(0).toUpperCase() + date.slice(1);
}

function getProchaineOuverture(courses: Course[]): Course | undefined {
    const aujourdHui = new Date();

    return courses
        .filter(
            (course) =>
                !course.inscriptionsOuvertes &&
                course.dateOuvertureInscription &&
                parseISOToLocalDate(course.dateOuvertureInscription) >= aujourdHui
        )
        .sort(
            (a, b) =>
                parseISOToLocalDate(a.dateOuvertureInscription!).getTime() -
                parseISOToLocalDate(b.dateOuvertureInscription!).getTime()
        )[0];
}

function separerCoursesParDate(courses: Course[]) {
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    const aVenir = courses
        .filter((course) => parseISOToLocalDate(course.date) >= aujourdHui)
        .sort((a, b) => parseISOToLocalDate(a.date).getTime() - parseISOToLocalDate(b.date).getTime());

    const passees = courses
        .filter((course) => parseISOToLocalDate(course.date) < aujourdHui)
        .sort((a, b) => parseISOToLocalDate(b.date).getTime() - parseISOToLocalDate(a.date).getTime());

    return { aVenir, passees };
}

function CarteSqueletteCourse({ passee = false }: { passee?: boolean }) {
    return (
        <div
            className={`flex flex-col gap-4 rounded-xl border border-club-100 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5 ${passee ? "bg-club-50/40 opacity-75" : "bg-white"
                }`}
        >
            <div className="flex shrink-0 items-center justify-start gap-2 border-b border-club-100 pb-3 sm:w-20 sm:flex-col sm:items-center sm:justify-center sm:gap-1 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                <div className="h-7 w-10 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
            </div>

            <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-5 w-28 animate-pulse rounded-full bg-gray-200" />
                </div>
                <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200 sm:w-1/2" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 sm:w-1/3" />
            </div>

            <div className="mt-2 flex shrink-0 flex-col gap-2 sm:mt-0 sm:items-end">
                <div className="h-9 w-full animate-pulse rounded-lg bg-gray-200 sm:w-32" />
                <div className="flex gap-2">
                    <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
                </div>
            </div>
        </div>
    );
}

interface CarteCourseProps {
    course: Course;
    role: Role;
    onChangerEtat: (nouvelEtat: EtatInteressementUtilisateur) => void;
    setModalDetailsPersonnes: React.Dispatch<React.SetStateAction<ObjetInteressementAdherent[] | null>>;
}

function CarteCourse({ course, role, onChangerEtat, setModalDetailsPersonnes }: CarteCourseProps) {
    const { jour, mois } = formaterJourMois(course.date);

    const estInteresse = course.etatInteressementUtilisateur === "interesse";
    const participe = course.etatInteressementUtilisateur === "participe";

    return (
        <article className="flex flex-col gap-4 rounded-xl border border-club-100 bg-white p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
            <div className="flex shrink-0 items-center justify-start gap-2 border-b border-club-100 pb-3 sm:w-20 sm:flex-col sm:items-center sm:justify-center sm:gap-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                <span className="font-display text-xl font-bold leading-none text-club-600 sm:text-3xl">
                    {jour}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-club-400 sm:mt-1">
                    {mois}
                </span>
            </div>

            <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[course.type] || "bg-club-50 text-club-700"
                            }`}
                    >
                        {course.type}
                    </span>

                    {course.inscriptionsOuvertes ? (
                        <span className="rounded-full bg-club-50 px-2.5 py-0.5 text-xs font-medium text-club-700">
                            Inscriptions ouvertes
                        </span>
                    ) : (
                        <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                            Inscriptions à venir
                        </span>
                    )}
                </div>

                <h3 className="mt-2 font-display text-base font-semibold text-club-700 sm:text-lg">
                    {course.nom}
                </h3>
                <p className="mt-1 text-xs text-club-900/70 sm:text-sm">
                    {formaterDateComplete(course.date)} · {course.lieu}
                    {course.distance && ` · ${course.distance}`}
                </p>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {course.lienSite && (
                        <a
                            href={course.lienSite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-club-600 underline hover:text-club-700"
                        >
                            Site de la course
                        </a>
                    )}
                    {course.lienInscription && (
                        <a
                            href={course.lienInscription}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-club-600 underline hover:text-club-700"
                        >
                            Site d'inscription
                        </a>
                    )}
                </div>
            </div>

            {role && (
                <div className="mt-2 flex shrink-0 flex-col gap-3 sm:mt-0 sm:items-end">
                    {/* Groupe Groupe WhatsApp */}
                    <div className="flex w-full items-center justify-stretch sm:w-auto">
                        {course.lienWhatsapp ? (
                            <a
                                href={course.lienWhatsapp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-accent-700 sm:w-auto sm:text-sm"
                            >
                                Groupe WhatsApp
                            </a>
                        ) : (
                            <span className="inline-flex w-full items-center justify-center rounded-lg border border-club-100 px-4 py-2 text-xs font-medium text-club-400 sm:w-auto sm:text-sm">
                                Pas encore de groupe
                            </span>
                        )}
                    </div>

                    {/* Groupe Boutons Actions (État + Liste) */}
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {role === "adherent" && (
                            <div className="w-full sm:w-auto">
                                <EtatInteressementAdherent
                                    estInteresse={estInteresse}
                                    participe={participe}
                                    setEtat={onChangerEtat}
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setModalDetailsPersonnes(course.listePersonnes)}
                            className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 sm:w-auto"
                        >
                            <Info size={14} />
                            <span>Liste des personnes</span>
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
}

export default function Calendrier() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [modalOuvert, setModalOuvert] = useState(false);
    const [calendrierJSON, setCalendrierJSON] = useState<CalendrierJSON>(DONNEES_JSON_PAR_DEFAUT);
    const [enChargement, setEnChargement] = useState(true);
    const [modalDetailsPersonnes, setModalDetailsPersonnes] = useState<ObjetInteressementAdherent[] | null>(null);

    // États pour la recherche et les filtres
    const [recherche, setRecherche] = useState("");
    const [typeActif, setTypeActif] = useState<string>("tous");

    const { role } = useAuth();
    const requete = useRequete();
    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        async function recupererDonnees() {
            try {
                const donneesCachees = await requeteJSON("calendrier", (nouvellesDonnees) => {
                    if (nouvellesDonnees) setCalendrierJSON(nouvellesDonnees);
                });

                if (donneesCachees) {
                    setCalendrierJSON(donneesCachees);
                }

                const coursesDonnees = await requete({ url: "/courses/toutes-les-courses" });
                setCourses(coursesDonnees);
            } catch (error) {
                console.error("Erreur lors de la récupération des données :", error);
            } finally {
                setEnChargement(false);
            }
        }

        recupererDonnees();
    }, []);

    // Extraction dynamique des types de course disponibles
    const typesDisponibles = useMemo(() => {
        const types = new Set<string>();
        courses.forEach((c) => {
            if (c.type) types.add(c.type);
        });
        return Array.from(types);
    }, [courses]);

    // Filtrage dynamique des courses (recherche + type)
    const coursesFiltrees = useMemo(() => {
        const requeteNormalisee = recherche.trim().toLocaleLowerCase("fr-FR");

        return courses.filter((course) => {
            const matchType = typeActif === "tous" || course.type === typeActif;

            if (!matchType) return false;
            if (!requeteNormalisee) return true;

            const nomMatch = course.nom?.toLocaleLowerCase("fr-FR").includes(requeteNormalisee);
            const lieuMatch = course.lieu?.toLocaleLowerCase("fr-FR").includes(requeteNormalisee);
            const typeMatch = course.type?.toLocaleLowerCase("fr-FR").includes(requeteNormalisee);
            const distanceMatch = course.distance?.toLocaleLowerCase("fr-FR").includes(requeteNormalisee);

            return nomMatch || lieuMatch || typeMatch || distanceMatch;
        });
    }, [courses, recherche, typeActif]);

    const handleChangerEtatCourse = async (idCourse: string | number, nouvelEtat: EtatInteressementUtilisateur) => {
        const reponse = await requete({
            url: "/courses/modifier-interessement",
            methode: "POST",
            corps: { idCourse, nouvelEtat: nouvelEtat ? nouvelEtat : "null" }
        });

        setCourses(reponse);
    };

    const prochaineOuverture = getProchaineOuverture(courses);
    const { aVenir, passees } = separerCoursesParDate(coursesFiltrees);

    return (
        <>
            <SEO
                titre={`${calendrierJSON.titre} 2026 — Running Vincennes Association`}
                description={calendrierJSON.introduction}
                chemin="/calendrier"
            />

            <div className="font-body text-club-900 conteneurPage w-full">
                {/* HERO */}
                <header className="bg-club-600">
                    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="max-w-2xl">
                                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                                    {calendrierJSON.titre}
                                </h1>

                                <p className="mt-3 text-sm leading-relaxed text-club-100 sm:mt-4 md:text-base">
                                    {calendrierJSON.introduction}
                                </p>
                            </div>

                            {role && (
                                <button
                                    onClick={() => setModalOuvert(true)}
                                    type="button"
                                    className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-club-700 transition hover:bg-club-50 sm:w-auto"
                                >
                                    <Plus size={16} />
                                    {role === "adherent" ? "Proposer" : "Ajouter"} une course
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* BARRE DE RECHERCHE ET FILTRES */}
                <section className="sticky top-0 z-10 border-b border-club-100 bg-white/95 backdrop-blur">
                    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
                        <div className="relative">
                            <Search
                                size={18}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-club-400"
                            />
                            <input
                                type="text"
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                                placeholder="Rechercher une course, une ville, une distance..."
                                className="w-full rounded-lg border border-club-200 bg-club-50/60 py-3 pl-11 pr-11 text-sm text-club-900 outline-none transition placeholder:text-club-400 focus:border-club-600 focus:bg-white"
                            />
                            {recherche && (
                                <button
                                    type="button"
                                    onClick={() => setRecherche("")}
                                    aria-label="Effacer la recherche"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-club-400 transition hover:bg-club-50 hover:text-club-700"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Filtres par type de course */}
                        <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                            <button
                                type="button"
                                onClick={() => setTypeActif("tous")}
                                className={`rounded-full px-4 py-1.5 text-xs font-medium transition sm:text-sm ${typeActif === "tous"
                                    ? "bg-club-600 text-white"
                                    : "bg-club-50 text-club-700 hover:bg-club-100"
                                    }`}
                            >
                                Tous les formats
                            </button>

                            {typesDisponibles.map((type) => {
                                const Icone = ICONES_TYPES_COURSE[type] ?? Sparkles;
                                const estActif = typeActif === type;

                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setTypeActif(type)}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition sm:text-sm ${estActif
                                            ? "bg-club-600 text-white"
                                            : "bg-club-50 text-club-700 hover:bg-club-100"
                                            }`}
                                    >
                                        <Icone size={14} />
                                        <span>{type}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {!enChargement && prochaineOuverture && !recherche && typeActif === "tous" && (
                    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
                        <div className="flex flex-col gap-4 rounded-xl border border-accent-500/30 bg-accent-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                                <span className="shrink-0 rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                    Ouverture d'inscription
                                </span>
                                <div>
                                    <p className="font-display text-base font-semibold text-club-700">
                                        {prochaineOuverture.nom}
                                    </p>
                                    <p className="mt-0.5 text-xs text-club-900/75 sm:text-sm">
                                        Inscriptions ouvrant le{" "}
                                        <span className="font-medium text-accent-700">
                                            {formaterDateComplete(
                                                prochaineOuverture.dateOuvertureInscription!
                                            )}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            {prochaineOuverture.lienInscription && (
                                <a
                                    href={prochaineOuverture.lienInscription}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 sm:w-auto"
                                >
                                    S'inscrire
                                </a>
                            )}
                        </div>
                    </section>
                )}

                {/* COURSES À VENIR */}
                <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
                    <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-end sm:gap-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-club-600 sm:text-sm">
                                À venir
                            </p>
                            <h2 className="mt-1 font-display text-xl font-semibold text-club-600 sm:text-2xl">
                                Prochaines échéances
                            </h2>
                        </div>
                        <span className="text-xs text-club-600 sm:text-sm">
                            {enChargement ? "Chargement..." : `${aVenir.length} courses trouvées`}
                        </span>
                    </div>

                    <div className="mt-6 flex flex-col gap-4 sm:mt-8">
                        {enChargement ? (
                            <>
                                <CarteSqueletteCourse />
                                <CarteSqueletteCourse />
                                <CarteSqueletteCourse />
                            </>
                        ) : (
                            <>
                                {aVenir.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-club-200 bg-club-50/60 px-6 py-12 text-center">
                                        <p className="font-display text-base font-semibold text-club-700">
                                            Aucune course à venir ne correspond à vos critères.
                                        </p>
                                        <p className="mt-1 text-xs text-club-900/70 sm:text-sm">
                                            Essayez de modifier votre recherche ou de réinitialiser les filtres.
                                        </p>
                                    </div>
                                )}
                                {aVenir.map((course, index) => (
                                    <CarteCourse
                                        key={course.id ?? `${course.nom}-${course.date}-${index}`}
                                        course={course}
                                        role={role}
                                        onChangerEtat={(nouvelEtat) =>
                                            handleChangerEtatCourse(course.id ?? index, nouvelEtat)
                                        }
                                        setModalDetailsPersonnes={setModalDetailsPersonnes}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </section>

                {/* COURSES PASSÉES */}
                {(enChargement || passees.length > 0) && (
                    <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-14">
                        <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-end sm:gap-4">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-club-400 sm:text-sm">
                                    Historique
                                </p>
                                <h2 className="mt-1 font-display text-xl font-semibold text-club-600 sm:text-2xl">
                                    Échéances passées
                                </h2>
                            </div>
                            <span className="text-xs text-club-400 sm:text-sm">
                                {enChargement ? "Chargement..." : `${passees.length} courses passées`}
                            </span>
                        </div>

                        <div className="mt-6 flex flex-col gap-4 sm:mt-8">
                            {enChargement ? (
                                <>
                                    <CarteSqueletteCourse passee />
                                    <CarteSqueletteCourse passee />
                                </>
                            ) : (
                                passees.map((course, index) => {
                                    const { jour, mois } = formaterJourMois(course.date);
                                    const keyUnique = course.id ?? `${course.nom}-${course.date}-${index}`;

                                    return (
                                        <article
                                            key={keyUnique}
                                            className="flex flex-col gap-4 rounded-xl border border-club-100 bg-club-50/40 p-4 opacity-75 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
                                        >
                                            <div className="flex shrink-0 items-center justify-start gap-2 border-b border-club-100 pb-3 sm:w-20 sm:flex-col sm:items-center sm:justify-center sm:gap-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                                                <span className="font-display text-xl font-bold leading-none text-club-400 sm:text-3xl">
                                                    {jour}
                                                </span>
                                                <span className="text-xs font-medium uppercase tracking-wide text-club-400 sm:mt-1">
                                                    {mois}
                                                </span>
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                                                        {course.type}
                                                    </span>
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                                                        Terminée
                                                    </span>
                                                </div>
                                                <h3 className="mt-2 font-display text-base font-semibold text-club-700 sm:text-lg">
                                                    {course.nom}
                                                </h3>
                                                <p className="mt-1 text-xs text-club-900/70 sm:text-sm">
                                                    {formaterDateComplete(course.date)} · {course.lieu}
                                                    {course.distance && ` · ${course.distance}`}
                                                </p>
                                                {course.lienSite && (
                                                    <a
                                                        href={course.lienSite}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 inline-block text-xs font-medium text-club-600 underline hover:text-club-700"
                                                    >
                                                        Site de la course
                                                    </a>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </section>
                )}

                {role === "adherent" && (
                    <section className="bg-club-50 py-10 sm:py-14">
                        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:px-6">
                            <h2 className="font-display text-lg font-semibold text-club-600 sm:text-xl md:text-2xl">
                                Une course à ajouter au calendrier ?
                            </h2>
                            <p className="max-w-md text-xs text-club-900/70 sm:text-sm">
                                Signalez-la à un membre du bureau pour qu'elle soit ajoutée avec, si besoin, un groupe WhatsApp dédié.
                            </p>
                            <button
                                onClick={() => setModalOuvert(true)}
                                type="button"
                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-club-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-club-700 sm:w-auto"
                            >
                                Proposer une course
                            </button>
                        </div>
                    </section>
                )}

                <ModalNouvelleCourse
                    ouvert={modalOuvert}
                    role={role}
                    onFermer={() => {
                        setModalOuvert(false);
                    }}
                    setCourses={setCourses}
                />

                <ModalListePersonnesInteresser
                    ouvert={!!modalDetailsPersonnes}
                    onFermer={() => setModalDetailsPersonnes(null)}
                    listePersonnes={modalDetailsPersonnes}
                />
            </div>
        </>
    );
}