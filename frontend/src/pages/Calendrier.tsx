import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRequete } from "../fonctions/requete";
import ModalNouvelleCourse from "../composants/calendrier/ModalNouvelleCourse";
import type { Course } from "../constantes/types/calendrier";
import { useAuth } from "../contexts/AuthContext";
import { useRequeteJSON } from "../fonctions/requeteJSON";
import SEO from "../composants/generale/SEO";


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

const MOIS_ABREGES = [
    "JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN",
    "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."
];

// Données par défaut pour le SEO et le premier rendu instantané
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
            className={`flex flex-col gap-4 rounded-xl border border-club-100 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5 ${
                passee ? "bg-club-50/40 opacity-75" : "bg-white"
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

            <div className="mt-2 flex shrink-0 sm:mt-0">
                <div className="h-9 w-full animate-pulse rounded-lg bg-gray-200 sm:w-32" />
            </div>
        </div>
    );
}

export default function Calendrier() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [modalOuvert, setModalOuvert] = useState(false);
    
    // Initialisation immédiate avec le JSON local pour supprimer le CLS / temps de vide
    const [calendrierJSON, setCalendrierJSON] = useState<CalendrierJSON>(DONNEES_JSON_PAR_DEFAUT);
    const [enChargement, setEnChargement] = useState(true);

    const { role } = useAuth();
    const requete = useRequete();
    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        async function recupererDonnees() {
            try {
                // 1. Récupération dynamique via le hook de cache
                const donneesCachees = await requeteJSON("calendrier", (nouvellesDonnees) => {
                    if (nouvellesDonnees) setCalendrierJSON(nouvellesDonnees);
                });

                if (donneesCachees) {
                    setCalendrierJSON(donneesCachees);
                }

                // 2. Requête API pour les courses
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

    const prochaineOuverture = getProchaineOuverture(courses);
    const { aVenir, passees } = separerCoursesParDate(courses);

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

                {/* BANDEAU PROCHAINE OUVERTURE D'INSCRIPTION */}
                {!enChargement && prochaineOuverture && (
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

                {/* LISTE DES COURSES À VENIR */}
                <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
                    <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-end sm:gap-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-club-400 sm:text-sm">
                                À venir
                            </p>
                            <h2 className="mt-1 font-display text-xl font-semibold text-club-600 sm:text-2xl">
                                Prochaines échéances
                            </h2>
                        </div>
                        <span className="text-xs text-club-400 sm:text-sm">
                            {enChargement ? "Chargement..." : `${aVenir.length} courses au calendrier`}
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
                                    <p className="text-sm text-club-900/60">
                                        Aucune course à venir pour le moment.
                                    </p>
                                )}
                                {aVenir.map((course, index) => {
                                    const { jour, mois } = formaterJourMois(course.date);
                                    const keyUnique = `${course.nom}-${course.date}-${index}`;

                                    return (
                                        <article
                                            key={keyUnique}
                                            className="flex flex-col gap-4 rounded-xl border border-club-100 bg-white p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
                                        >
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
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            TYPE_STYLES[course.type] || "bg-club-50 text-club-700"
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
                                                <div className="mt-2 flex shrink-0 items-center justify-stretch sm:mt-0 sm:justify-end">
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
                                            )}
                                        </article>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </section>

                {/* LISTE DES COURSES PASSÉES */}
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
                                    const keyUnique = `${course.nom}-${course.date}-${index}`;

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

                {/* CTA PROPOSER UNE COURSE */}
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
            </div>
        </>
    );
}