/**
 * Page "Anniversaires" : deux modes d'affichage au choix (liste / calendrier).
 * `dateNaissance` est au format "JJ.MM" ou "JJ.MM.YYYY" (année optionnelle).
 */

import { useEffect, useMemo, useState } from "react";
import { Cake, CalendarDays, ChevronLeft, ChevronRight, List, X } from "lucide-react";
import SEO from "../../composants/generale/SEO";
import { useRequete } from "../../fonctions/requete";
import { useRequeteJSON } from "../../fonctions/requeteJSON";

export interface Anniversaire {
    id: number | string;
    prenom: string;
    nom: string;
    dateNaissance: string; // Format "JJ.MM" ou "JJ.MM.YYYY"
    cheminTrombinoscope?: string;
}

const DONNEES_PAR_DEFAUT = {
    titre: "🎂 Anniversaires du club"
}

const NOMS_MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const NOMS_JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Partionne la chaîne "JJ.MM" ou "JJ.MM.YYYY" */
function jourMoisDate(chaineDate: string) {
    if (!chaineDate) return { jour: 1, mois: 0, annee: undefined };

    const parties = chaineDate.split(".").map((p) => parseInt(p, 10));
    const jour = parties[0] || 1;
    const mois = (parties[1] ? parties[1] - 1 : 0); // Les mois JS vont de 0 à 11
    const annee = parties[2]; // undefined si format "JJ.MM"

    return { jour, mois, annee };
}

/** Calcule l'âge seulement si l'année est renseignée ("JJ.MM.YYYY") */
function calculerAge(chaineDate: string): number | null {
    const { jour, mois, annee } = jourMoisDate(chaineDate);
    if (!annee) return null;

    const auj = new Date();
    let age = auj.getFullYear() - annee;
    const anniversairePasse = auj.getMonth() > mois || (auj.getMonth() === mois && auj.getDate() >= jour);
    if (!anniversairePasse) age -= 1;
    return age;
}

function estAujourdHui(chaineDate: string): boolean {
    const { jour, mois } = jourMoisDate(chaineDate);
    const auj = new Date();
    return jour === auj.getDate() && mois === auj.getMonth();
}

/** Date de la PROCHAINE occurrence */
function prochaineOccurrence(chaineDate: string): Date {
    const { jour, mois } = jourMoisDate(chaineDate);
    const auj = new Date();
    const aujMinuit = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
    let prochaine = new Date(auj.getFullYear(), mois, jour);

    if (prochaine < aujMinuit) {
        prochaine = new Date(auj.getFullYear() + 1, mois, jour);
    }
    return prochaine;
}

export default function Anniversaires() {
    const [vue, setVue] = useState<"calendrier" | "liste">("liste");
    const [anniversaires, setAnniversaires] = useState<Anniversaire[] | null>(null);
    const [anniversairesJSON, setAnniversairesJSON] = useState(DONNEES_PAR_DEFAUT);
    const [moisAffiche, setMoisAffiche] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });
    const [membreAgrandi, setMembreAgrandi] = useState<string | null>(null);

    const requete = useRequete();
    const requeteJSON = useRequeteJSON()

    useEffect(() => {
        async function charger() {
            const texteCacheInitial = await requeteJSON("ressources/categories-ffa", (nouvellesDonnees) => {
                if (nouvellesDonnees) {
                    setAnniversairesJSON((prev) => ({ ...prev, ...nouvellesDonnees }));
                }
            });

            if (texteCacheInitial) {
                setAnniversairesJSON((prev) => ({ ...prev, ...texteCacheInitial }));
            }
            const donnees = await requete({ url: "/utilisateurs/anniversaires" });
            setAnniversaires(donnees);
        }

        charger();
    }, []);

    // Fermeture de la photo agrandie avec la touche Échap
    useEffect(() => {
        if (!membreAgrandi) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setMembreAgrandi(null);
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [membreAgrandi]);

    const listeTriee = useMemo(() => {
        const items = anniversaires ?? [];
        return [...items].sort((a, b) => prochaineOccurrence(a.dateNaissance).getTime() - prochaineOccurrence(b.dateNaissance).getTime());
    }, [anniversaires]);

    return (
        <>
            <SEO
                titre="Anniversaires — Running Vincennes Association (RVA)"
                description="Les anniversaires des adhérents du club RVA, en liste ou en calendrier."
                chemin="/anniversaires"
            />

            <div className="mx-auto max-w-5xl px-6 py-10">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <h1 className="font-display text-2xl font-bold text-club-600 sm:text-3xl">{anniversairesJSON.titre}</h1>

                    <div className="flex gap-1 rounded-lg bg-club-50 p-1">
                        <button
                            type="button"
                            onClick={() => setVue("liste")}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${vue === "liste" ? "bg-white text-club-900 shadow-sm" : "text-club-600 hover:text-club-900"}`}
                        >
                            <List size={14} />
                            Liste
                        </button>
                        <button
                            type="button"
                            onClick={() => setVue("calendrier")}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${vue === "calendrier" ? "bg-white text-club-900 shadow-sm" : "text-club-600 hover:text-club-900"}`}
                        >
                            <CalendarDays size={14} />
                            Calendrier
                        </button>
                    </div>
                </div>

                {anniversaires === null ? (
                    <p className="py-16 text-center text-sm text-club-400">Chargement…</p>
                ) : vue === "liste" ? (
                    <VueListe anniversaires={listeTriee} setMembreAgrandi={setMembreAgrandi} />
                ) : (
                    <VueCalendrier anniversaires={anniversaires} moisAffiche={moisAffiche} setMoisAffiche={setMoisAffiche} />
                )}
            </div>

            {/* Lightbox : photo agrandie */}
            {membreAgrandi && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
                    onClick={() => setMembreAgrandi(null)}
                >
                    <button
                        type="button"
                        onClick={() => setMembreAgrandi(null)}
                        aria-label="Fermer"
                        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X size={22} />
                    </button>
                    <figure
                        className="flex max-h-full max-w-full flex-col items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={"/utilisateurs/photo/" + membreAgrandi}
                            alt={`Photo de d'un membre`}
                            className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                        />
                    </figure>
                </div>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Vue liste : cartes chronologiques                                 */
/* ------------------------------------------------------------------ */

function VueListe({ anniversaires, setMembreAgrandi }: { anniversaires: Anniversaire[], setMembreAgrandi: (chemin: string | null) => void }) {
    if (anniversaires.length === 0) {
        return <p className="py-16 text-center text-sm text-club-400">Aucun anniversaire enregistré pour le moment.</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            {anniversaires.map((personne) => (
                <CarteAnniversaire key={personne.id} personne={personne} setMembreAgrandi={setMembreAgrandi} />
            ))}
        </div>
    );
}

function CarteAnniversaire({ personne, setMembreAgrandi }: { personne: Anniversaire, setMembreAgrandi: (chemin: string | null) => void }) {
    const { jour, mois } = jourMoisDate(personne.dateNaissance);
    const aujourdhui = estAujourdHui(personne.dateNaissance);
    const age = calculerAge(personne.dateNaissance);

    return (
        <article
            className={`flex flex-col gap-4 rounded-xl border p-4 transition-all duration-300 sm:flex-row sm:items-center sm:gap-6 sm:p-5 ${aujourdhui ? "border-accent-300 bg-accent-100/40" : "border-club-100 bg-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-club-200/40"
                }`}
        >
            <div className="flex shrink-0 items-center justify-start gap-2 border-b border-club-100 pb-3 sm:w-20 sm:flex-col sm:items-center sm:justify-center sm:gap-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                <span className="font-display text-xl font-bold leading-none text-club-600 sm:text-3xl">{jour}</span>
                <span className="text-xs font-medium uppercase tracking-wide text-club-400 sm:mt-1">{NOMS_MOIS[mois]?.slice(0, 3)}</span>
            </div>

            <div className="flex flex-1 items-center gap-3">
                {personne.cheminTrombinoscope ? (
                    <img
                        src={"/utilisateurs/photo/" + personne.cheminTrombinoscope}
                        alt={`${personne.prenom} ${personne.nom}`}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                        onClick={() => setMembreAgrandi(personne?.cheminTrombinoscope)}
                    />
                ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-club-50 text-club-400">
                        <Cake size={20} />
                    </div>
                )}
                <div>
                    <h3 className="font-display text-base font-semibold text-club-700 sm:text-lg">
                        {personne.prenom} {personne.nom}
                    </h3>
                    {age !== null && <p className="mt-0.5 text-xs text-club-900/60 sm:text-sm">{age} ans</p>}
                </div>
            </div>

            {aujourdhui && (
                <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white sm:self-center">
                    🎉 Aujourd'hui !
                </span>
            )}
        </article>
    );
}

/* ------------------------------------------------------------------ */
/* Vue calendrier : grille mensuelle navigable                        */
/* ------------------------------------------------------------------ */

interface VueCalendrierProps {
    anniversaires: Anniversaire[];
    moisAffiche: Date;
    setMoisAffiche: (d: Date) => void;
}

function VueCalendrier({ anniversaires, moisAffiche, setMoisAffiche }: VueCalendrierProps) {
    const [jourSelectionne, setJourSelectionne] = useState<number | null>(null);

    const annee = moisAffiche.getFullYear();
    const mois = moisAffiche.getMonth();

    const parJour = useMemo(() => {
        const map = new Map<number, Anniversaire[]>();
        for (const personne of anniversaires) {
            const d = jourMoisDate(personne.dateNaissance);
            if (d.mois !== mois) continue;
            const liste = map.get(d.jour) ?? [];
            liste.push(personne);
            map.set(d.jour, liste);
        }
        return map;
    }, [anniversaires, mois]);

    const premierJourSemaine = (new Date(annee, mois, 1).getDay() + 6) % 7; // lundi = 0
    const nbJours = new Date(annee, mois + 1, 0).getDate();
    const cases: (number | null)[] = [...Array(premierJourSemaine).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)];

    const auj = new Date();
    const estMoisCourant = auj.getFullYear() === annee && auj.getMonth() === mois;

    function changerMois(delta: number) {
        setJourSelectionne(null);
        setMoisAffiche(new Date(annee, mois + delta, 1));
    }

    const personnesJourSelectionne = jourSelectionne !== null ? parJour.get(jourSelectionne) : undefined;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <button type="button" onClick={() => changerMois(-1)} className="cursor-pointer rounded-lg p-2 text-club-600 transition hover:bg-club-50" aria-label="Mois précédent">
                    <ChevronLeft size={20} />
                </button>
                <h2 className="font-display text-lg font-semibold text-club-700">
                    {NOMS_MOIS[mois]} {annee}
                </h2>
                <button type="button" onClick={() => changerMois(1)} className="cursor-pointer rounded-lg p-2 text-club-600 transition hover:bg-club-50" aria-label="Mois suivant">
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-club-400">
                {NOMS_JOURS.map((j) => (
                    <div key={j} className="py-2">
                        {j}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {cases.map((jour, i) => {
                    if (jour === null) return <div key={`vide-${i}`} />;
                    const personnes = parJour.get(jour) ?? [];
                    const estAuj = estMoisCourant && jour === auj.getDate();
                    const estSelectionne = jour === jourSelectionne;
                    const nomsAffiches = personnes.slice(0, 2);
                    const nbEnPlus = personnes.length - nomsAffiches.length;

                    return (
                        <button
                            type="button"
                            key={jour}
                            onClick={() => personnes.length > 0 && setJourSelectionne(estSelectionne ? null : jour)}
                            className={`relative flex min-h-16 flex-col items-center gap-0.5 overflow-hidden rounded-lg border p-1 pt-1.5 text-sm transition-all duration-200 sm:min-h-20 ${estSelectionne
                                ? "border-accent-500 bg-accent-500 text-white"
                                : estAuj
                                    ? "border-accent-500 bg-accent-100/50 font-semibold text-accent-700"
                                    : "border-club-100 text-club-700 hover:bg-club-50"
                                } ${personnes.length > 0 ? "cursor-pointer" : "cursor-default"}`}
                        >
                            <span className="shrink-0 leading-none">{jour}</span>

                            {personnes.length > 0 && (
                                <div className="mt-0.5 flex w-full flex-col items-stretch gap-0.5 px-0.5">
                                    {nomsAffiches.map((p) => (
                                        <span
                                            key={p.id}
                                            className={`w-full truncate rounded px-1 py-0.5 text-center text-[9px] font-medium leading-tight sm:text-[10px] ${estSelectionne ? "bg-white/20 text-white" : "bg-accent-100 text-accent-700"
                                                }`}
                                            title={`${p.prenom} ${p.nom}`}
                                        >
                                            {p.prenom}
                                        </span>
                                    ))}
                                    {nbEnPlus > 0 && (
                                        <span className={`w-full text-center text-[9px] font-semibold sm:text-[10px] ${estSelectionne ? "text-white" : "text-accent-600"}`}>
                                            +{nbEnPlus}
                                        </span>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {personnesJourSelectionne && personnesJourSelectionne.length > 0 && (
                <div className="mt-4 rounded-xl border border-club-100 bg-club-50 p-4">
                    <p className="mb-2 text-sm font-medium text-club-700">
                        {jourSelectionne} {NOMS_MOIS[mois]}
                    </p>
                    <div className="flex flex-col gap-2">
                        {personnesJourSelectionne.map((p) => {
                            const age = calculerAge(p.dateNaissance);
                            return (
                                <div key={p.id} className="flex items-center gap-2 text-sm text-club-900/80">
                                    <Cake size={14} className="text-accent-500" />
                                    {p.prenom} {p.nom} {age !== null ? `· ${age} ans` : ""}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}