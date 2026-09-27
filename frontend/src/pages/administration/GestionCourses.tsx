/**
 * Back-office : liste des courses (GET /courses/toutes-les-courses-admin).
 * La création et l'édition passent par ModalNouvelleCourse.
 */

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { Pencil, Trash2, Loader2, MapPin, MessageCircle } from "lucide-react";
import type { Course } from "../../constantes/types/calendrier";
import { useListeAdmin } from "../../fonctions/useListeAdmin";
import ListeAdministration from "./ListeAdministration";
import ModalConfirmationSuppression from "../../composants/modal/administration/ModalConfirmerSuppression";
import ModalNouvelleCourse from "../../composants/modal/calendrier/ModalNouvelleCourse";

const ONGLETS_COURSES = [
    { value: "tous", label: "Toutes" },
    { value: "a_venir", label: "À venir" },
    { value: "passees", label: "Passées" },
    { value: "suggestion", label: "Suggestions" },
] as const;

function comparerCourses(a: Course, b: Course) {
    return a.date < b.date ? -1 : 1;
}

export default function GestionCourses() {
    const aujourdhui = new Date().toISOString().slice(0, 10);

    const filtrerCourse = useCallback(
        (c: Course, onglet: string, recherche: string) => {
            const dansOnglet = onglet === "a_venir" ? c.date >= aujourdhui : onglet === "passees" ? c.date < aujourdhui : onglet === "suggestion" ? c.etat === "suggestion" : true;
            return dansOnglet && (c.nom.toLowerCase().includes(recherche) || c.lieu.toLowerCase().includes(recherche));
        },
        [aujourdhui],
    );

    const { setDonnees, elementsFiltres, enChargement, onglet, setOnglet, recherche, setRecherche } = useListeAdmin<Course>({
        url: "/courses/toutes-les-courses-admin",
        filtrer: filtrerCourse,
        comparer: comparerCourses,
    });
    const [elementASupprimer, setElementASupprimer] = useState<string | null>(null);

    // Modale de création/édition de course
    const [modalCourseOuvert, setModalCourseOuvert] = useState(false);
    const [ancienneDonneesCourse, setAncienneDonneesCourse] = useState<Course | undefined>(undefined);

    // ModalNouvelleCourse attend une liste non nulle : la mise à jour fonctionnelle part d'une liste vide tant que rien n'est chargé.
    const setCourses: Dispatch<SetStateAction<Course[]>> = (valeur) => setDonnees((precedent) => (typeof valeur === "function" ? valeur(precedent ?? []) : valeur));

    return (
        <ListeAdministration
            titreDocument="Gestion courses"
            titre="Courses"
            action={{
                texte: "Nouvelle course",
                onClick: () => {
                    setAncienneDonneesCourse(undefined);
                    setModalCourseOuvert(true);
                },
            }}
            onglets={ONGLETS_COURSES}
            onglet={onglet}
            setOnglet={setOnglet}
            recherche={recherche}
            setRecherche={setRecherche}
            placeholderRecherche="Rechercher une course, une ville…"
            enChargement={enChargement}
            texteChargement="Chargement des courses…"
            estVide={elementsFiltres.length === 0}
            texteVide="Aucune course ne correspond à cette recherche."
            modales={
                <>
                    <ModalConfirmationSuppression titre="Supprimer la course" texte={elementASupprimer} onFermer={() => setElementASupprimer(null)} setter={setDonnees} urlApi="/courses/supprimer" />
                    <ModalNouvelleCourse
                        key={ancienneDonneesCourse?.nom ?? "nouvelle"}
                        ancienneDonnees={ancienneDonneesCourse}
                        ouvert={modalCourseOuvert}
                        onFermer={() => {
                            setModalCourseOuvert(false);
                            setAncienneDonneesCourse(undefined);
                        }}
                        setCourses={setCourses}
                        role={"administrateur"}
                    />
                </>
            }
        >
            {elementsFiltres.map((c) => {
                const estPassee = c.date < aujourdhui;
                return (
                    <li key={c.id} className="flex items-center gap-4 rounded-xl border border-club-100 bg-white px-4 py-3 transition hover:border-club-200">
                        {/* Date */}
                        <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-club-50 ${estPassee ? "text-club-300" : "text-club-600"}`}>
                            <span className="text-[10px] font-medium uppercase">{new Date(c.date).toLocaleDateString("fr-FR", { month: "short" })}</span>
                            <span className="font-display text-lg font-bold leading-none">{new Date(c.date).getDate()}</span>
                        </div>

                        {/* Infos */}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#040F33]">{c.nom}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-club-50 px-2.5 py-0.5 text-xs font-medium text-club-700">{c.type}</span>
                                {c.distance && <span className="text-xs text-[#0B2270]/50">{c.distance}</span>}
                                <span className="flex items-center gap-1 text-xs text-[#0B2270]/50">
                                    <MapPin size={11} />
                                    {c.lieu}
                                </span>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.inscriptionsOuvertes ? "bg-green-100 text-green-800" : "bg-club-100 text-club-600"}`}>{c.inscriptionsOuvertes ? "Inscriptions ouvertes" : "Inscriptions fermées"}</span>
                                {c.etat === "suggestion" && <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">Suggestion</span>}
                                {estPassee && <span className="rounded-full bg-club-100 px-2.5 py-0.5 text-xs font-medium text-club-500">Passée</span>}
                            </div>
                        </div>

                        {/* Liens rapides + actions */}
                        <div className="flex shrink-0 items-center gap-1">
                            {c.lienWhatsapp && (
                                <a href={c.lienWhatsapp} target="_blank" rel="noopener noreferrer" aria-label="Groupe WhatsApp" title="Groupe WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50">
                                    <MessageCircle size={16} />
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setAncienneDonneesCourse(c);
                                    setModalCourseOuvert(true);
                                }}
                                aria-label="Modifier"
                                title="Modifier"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50"
                            >
                                <Pencil size={16} />
                            </button>
                            <button type="button" onClick={() => setElementASupprimer(c.nom)} disabled={elementASupprimer === c.nom} aria-label="Supprimer" title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50">
                                {elementASupprimer === c.nom ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                        </div>
                    </li>
                );
            })}
        </ListeAdministration>
    );
}
