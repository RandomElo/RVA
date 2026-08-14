/**
 * Page back-office générique : liste des articles, des courses ou des
 * adhérents selon la prop `mode`.
 *
 * Prérequis :
 * 1. lucide-react installé.
 * 2. react-router-dom pour la navigation vers la création/édition.
 * 3. Articles : GET /blog/recuperer-tous-articles-admin (déjà en place).
 * 4. Courses : GET /courses/toutes-les-courses doit renvoyer des objets
 *    conformes au type Course (../constantes/types/calendrier). La création
 *    et l'édition passent par ModalNouvelleCourse (plus de page dédiée).
 *    Brancher aussi DELETE /courses/supprimer pour la suppression.
 * 5. Adhérents : PAS D'ENDPOINT POUR L'INSTANT. La liste est alimentée
 *    par ADHERENTS_FAKE (données fictives) le temps que la liste blanche
 *    et l'envoi d'invitation soient développés côté back (§3.3 du cahier
 *    des charges). Remplacer par un vrai GET /adherents dès que possible,
 *    et brancher DELETE /adherents/supprimer pour retirer un e-mail de
 *    la liste blanche.
 * 6. Vérifier que ModalConfirmationSuppression accepte bien un `setter`
 *    générique (Article[] | Course[] | Adherent[]) — si son typage est
 *    figé sur ArticleListe[], il faudra l'élargir.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, FileText, Globe, Loader2, Inbox, MapPin, MessageCircle, Mail, Users, Clock, Camera, Settings, Stethoscope } from "lucide-react";
import { LABEL_CATEGORIE, STYLE_BADGE, ONGLETS, type Categorie } from "../../constantes/types/blog";
import { useRequete } from "../../fonctions/requete";
import type { Course } from "../../constantes/types/calendrier";
import ModalConfirmationSuppression from "../../composants/modal/administrationElement/ModalConfirmerSuppression";
import ModalNouvelleCourse from "../../composants/modal/calendrier/ModalNouvelleCourse";
import ModalInviterAdherent from "../../composants/modal/administrationElement/ModalInviterAdherent";
import ModalPhotoAdherent from "../../composants/modal/trombinoscope/ModalPhotoAdherent";
import ModalZipPhotos from "../../composants/modal/trombinoscope/ModalZipPhotos";
import ModalActionsAdherent from "../../composants/modal/administrationElement/ModalActionsAdherent";
import type { Adherent } from "../../constantes/types/adherents";
import { type Specialiste } from "../../constantes/types/specialistesSante";
import ModalNouveauSpecialiste from "../../composants/specialistesSante/ModalNouveauSpecialiste";
import ModalConfirmationRelance from "../../composants/modal/administrationElement/ModalConfirmerRelance";

type Statut = "brouillon" | "publie" | "suggestion";

type ArticleListe = {
    url: string;
    titre: string;
    categorie: Categorie;
    type: Statut;
    imageUrl?: string;
    datePublication: string; // yyyy-mm-dd
};

const ONGLETS_ARTICLES = [
    ...ONGLETS,
    { value: "publie", label: "Pubilés" },
    { value: "brouillon", label: "Brouillons" },
    { value: "suggestion", label: "Suggestions" },
] as const;

const ONGLETS_COURSES = [
    { value: "tous", label: "Toutes" },
    { value: "a_venir", label: "À venir" },
    { value: "passees", label: "Passées" },
    { value: "suggestion", label: "Suggestions" },
] as const;

const ONGLETS_ADHERENTS = [
    { value: "tous", label: "Tous" },
    { value: "actif", label: "Actifs" },
    { value: "en_attente", label: "En attente" },
] as const;

const ONGLETS_SPECIALISTE = [
    { value: "tous", label: "Tous" },
    { value: "suggestion", label: "Suggestion" },
    { value: "kine_sport", label: "Kiné du sport" },
    { value: "kine", label: "Kiné" },
    { value: "podologue", label: "Podologue" },
    { value: "osteopathe", label: "Ostéopathe" },
    { value: "medecin_sport", label: "Médecin du sport" },
] as const;

type Mode = "courses" | "blog" | "adherents" | "specialistesSante";
type Props = {
    mode: Mode
};

export default function AdministrationElement({ mode }: Props) {
    // State par type de donnée (un seul est utilisé selon `mode`)
    const [articles, setArticles] = useState<ArticleListe[] | null>(null);
    const [courses, setCourses] = useState<Course[] | null>(null);
    const [adherents, setAdherents] = useState<Adherent[] | null>(null);
    const [specialistesSante, setSpecialistesSante] = useState<Specialiste[] | null>(null);

    const [onglet, setOnglet] = useState<string>("tous");
    const [recherche, setRecherche] = useState("");
    const [elementASupprimer, setElementASupprimer] = useState<string | null>(null);

    // Modale de création/édition de course (remplace la navigation par page)
    const [modalCourseOuvert, setModalCourseOuvert] = useState(false);
    const [ancienneDonneesCourse, setAncienneDonneesCourse] = useState<Course | undefined>(undefined);

    // Modales adhérents
    const [modalInviterMembre, setModalInviterMembre] = useState<Adherent | boolean | null>(null)
    const [modalPhotoAdherent, setModalPhotoAdherent] = useState<Adherent | null>(null)
    const [modalImportPhotosZip, setModalImportPhotosZip] = useState<boolean>(false)
    const [modalActionsAdherents, setModalActionsAdherents] = useState<null | Adherent>(null)
    const [modalConfirmerRelance, setModalConfirmerRelance] = useState<Adherent | null>(null)

    // Modales spécialiste
    const [modalModifierSpecialiste, setModalModifierSpecialiste] = useState<Specialiste | null>(null)

    const requete = useRequete();
    const aujourdhui = new Date().toISOString().slice(0, 10);

    useEffect(() => {
        const getTitreMode = (mode: Mode) => {
            switch (mode) {
                case "blog":
                    return "Gestion blog";
                case "adherents":
                    return "Gestion adhérents";
                case "courses":
                    return "Gestion courses";
                case "specialistesSante": // Ajuste la clé si nécessaire
                    return "Gestion spécialistes santé";
                default:
                    return "Administration";
            }
        };

        document.title = `${getTitreMode(mode)} - Running Vincennes Association`;

        async function recuperationDonnees() {
            setOnglet("tous");
            setRecherche("");
            setModalCourseOuvert(false);
            setAncienneDonneesCourse(undefined);

            if (mode === "blog") {
                const donnees = await requete({ url: "/articles/recuperer-tous-articles-admin" });
                setArticles(donnees);
            } else if (mode === "courses") {
                const donnees = await requete({ url: "/courses/toutes-les-courses-admin" });
                setCourses(donnees);
            } else if (mode === "adherents") {
                const donnees = await requete({ url: "/utilisateurs/recuperer-utilisateurs" });
                setAdherents(donnees);
            } else if (mode == "specialistesSante") {
                const donnees = await requete({ url: "/specialistes/toutes-les-specialistes-admin" });
                setSpecialistesSante(donnees);
            }
        }
        recuperationDonnees();
    }, [mode]);

    const articlesFiltres = useMemo(() => {
        if (!articles) return [];
        return articles
            .filter((a) => onglet === "tous" || a.categorie === onglet || a.type == onglet)
            .filter((a) => a.titre.toLowerCase().includes(recherche.trim().toLowerCase()))
            .sort((a, b) => (a.datePublication < b.datePublication ? 1 : -1));
    }, [articles, onglet, recherche]);

    const coursesFiltrees = useMemo(() => {
        if (!courses) return [];
        return courses
            .filter((c) => {
                if (onglet === "tous") return true;
                if (onglet === "a_venir") return c.date >= aujourdhui;
                if (onglet === "passees") return c.date < aujourdhui;
                if (onglet === "suggestion") return c.etat === "suggestion";
                return true;
            })
            .filter((c) => c.nom.toLowerCase().includes(recherche.trim().toLowerCase()) || c.lieu.toLowerCase().includes(recherche.trim().toLowerCase()))
            .sort((a, b) => (a.date < b.date ? -1 : 1));
    }, [courses, onglet, recherche]);

    const adherentsFiltres = useMemo(() => {
        if (!adherents) return [];
        return adherents
            // .filter((a) => onglet === "tous" || a.statut === onglet)
            .filter((a) => onglet === "tous" ? true : onglet === "actif" ? a.derniereConnexion : !a.derniereConnexion)
            .filter((a) => a.nom.toLowerCase().includes(recherche.trim().toLowerCase()) || a.mail.toLowerCase().includes(recherche.trim().toLowerCase()))
            .sort((a, b) => (a.derniereConnexion < b.derniereConnexion ? 1 : -1));
    }, [adherents, onglet, recherche]);

    const specialistesFiltres = useMemo(() => {
        if (!specialistesSante) return [];
        const q = recherche.trim().toLowerCase();
        return specialistesSante
            .filter((s) => onglet === "tous" || (onglet === "suggestion" ? s.etat === "suggestion" : s.specialite === onglet))
            .filter((s) => !q || s.nom.toLowerCase().includes(q));
    }, [specialistesSante, onglet, recherche]);

    const enChargement = (mode === "blog" && articles === null) || (mode === "courses" && courses === null) || (mode === "adherents" && adherents === null) || (mode === "specialistesSante" && specialistesSante === null);

    const config = {
        blog: {
            titre: "Articles",
            texteBouton: "Nouvel article",
            lienNouveau: "/rediger-article",
            onglets: ONGLETS_ARTICLES as unknown as { value: string; label: string }[],
            placeholderRecherche: "Rechercher un titre…",
            texteChargement: "Chargement des articles…",
            texteVide: "Aucun article ne correspond à cette recherche.",
        },
        courses: {
            titre: "Courses",
            texteBouton: "Nouvelle course",
            onglets: ONGLETS_COURSES as unknown as { value: string; label: string }[],
            placeholderRecherche: "Rechercher une course, une ville…",
            texteChargement: "Chargement des courses…",
            texteVide: "Aucune course ne correspond à cette recherche.",
        },
        adherents: {
            titre: "Adhérents",
            texteBouton: "Inviter des adhérents",
            lienNouveau: "/administration/adherents/inviter",
            onglets: ONGLETS_ADHERENTS as unknown as { value: string; label: string }[],
            placeholderRecherche: "Rechercher un nom, un e-mail…",
            texteChargement: "Chargement des adhérents…",
            texteVide: "Aucun adhérent ne correspond à cette recherche.",
        },
        specialistesSante: {
            titre: "Spécialistes de santé",
            texteBouton: "Ajouter des spécialistes",
            onglets: ONGLETS_SPECIALISTE as unknown as { value: string; label: string }[],
            placeholderRecherche: "Rechercher un nom…",
            texteChargement: "Chargement des spécialistes…",
            texteVide: "Aucun spécialiste ne correspond à cette recherche.",
        },
    }[mode];

    return (
        <div className="mx-auto w-5xl px-6 py-10">
            <div className="mb-3">
                <Link to="/administration" className="font-body text-sm text-club-600 hover:text-club-700">
                    ← Interface administration
                </Link>
            </div>
            {/* En-tête */}
            <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-[#040F33] sm:text-3xl">{config.titre}</h1>
                </div>

                {mode === "courses" ? (
                    <button
                        type="button"
                        onClick={() => {
                            setAncienneDonneesCourse(undefined);
                            setModalCourseOuvert(true);
                        }}
                        className="flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition bg-accent-500 hover:bg-accent-700"
                    >
                        <Plus size={18} />
                        {config.texteBouton}
                    </button>
                ) : mode === "adherents" ?
                    <button
                        type="button"
                        className="flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition bg-accent-500 hover:bg-accent-700"
                        onClick={() => setModalInviterMembre(true)}
                    >
                        <Plus size={18} />
                        {config.texteBouton}
                    </button>

                    : (
                        <Link to={(config as { lienNouveau: string }).lienNouveau} className="flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition bg-accent-500 hover:bg-accent-700">
                            <Plus size={18} />
                            {config.texteBouton}
                        </Link>
                    )}
            </header>

            {/* Filtres */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <nav className={`flex flex-wrap gap-2 ${mode == "blog" && "max-w-150 "}`}>
                    {config.onglets.map((o) => (
                        <button key={o.value} type="button" onClick={() => setOnglet(o.value)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${onglet === o.value ? "bg-club-600 text-white" : "bg-club-50 text-[#0B2270] hover:bg-club-100"}`}>
                            {o.label}
                        </button>
                    ))}
                </nav>
                <div className="relative w-full sm:w-64">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0B2270]/40"
                    />

                    <input
                        type="search"
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        placeholder={config.placeholderRecherche}
                        className="w-full rounded-lg border border-club-200 py-2 pl-9 pr-3 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                    />
                </div>
            </div>
            {mode === "adherents" &&
                <div className="flex justify-end mb-5">
                    <button
                        className="flex items-center justify-center  gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition bg-accent-500 hover:bg-accent-700"
                        onClick={() => setModalImportPhotosZip(true)}

                    >+ Télécharger un .zip pour le trombinoscope</button>
                </div>
            }

            {/* Liste */}
            {enChargement ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#0B2270]/60">
                    <Loader2 size={18} className="animate-spin" />
                    {config.texteChargement}
                </div>
            ) : mode === "blog" ? (
                articlesFiltres.length === 0 ? (
                    <EtatVide texte={config.texteVide} />
                ) : (
                    <ul className="flex flex-col gap-2">
                        {articlesFiltres.map((a, key) => (
                            <li key={key} className="flex items-center gap-4 rounded-xl border border-club-100 bg-white px-4 py-3 transition hover:border-club-200">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-club-50">
                                    {a.imageUrl ? (
                                        <img src={a.imageUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-club-300">
                                            <FileText size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[#040F33]">{a.titre}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE_BADGE[a.categorie]}`}>{LABEL_CATEGORIE[a.categorie]}</span>
                                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${a.type === "publie" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                            {a.type === "publie" ? <Globe size={11} /> : <FileText size={11} />}
                                            {a.type === "publie" ? "Publié" : a.type == "suggestion" ? "Suggestion" : "Brouillon"}
                                        </span>
                                        <span className="text-xs text-[#0B2270]/50">{new Date(a.datePublication).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    {a.categorie !== "newsletter" &&
                                        <Link to={`/administration/modifier-article/${a.url}`} aria-label="Modifier" title="Modifier" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50">
                                            <Pencil size={16} />
                                        </Link>
                                    }

                                    <button type="button" onClick={() => setElementASupprimer(a.titre)} disabled={elementASupprimer === a.titre} aria-label="Supprimer" title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50">
                                        {elementASupprimer === a.titre ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            ) : mode === "courses" ? (
                coursesFiltrees.length === 0 ? (
                    <EtatVide texte={config.texteVide} />
                ) : (
                    <ul className="flex flex-col gap-2">
                        {coursesFiltrees.map((c, key) => {
                            const estPassee = c.date < aujourdhui;
                            return (
                                <li key={key} className="flex items-center gap-4 rounded-xl border border-club-100 bg-white px-4 py-3 transition hover:border-club-200">
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
                                            {c.etat == "suggestion" &&
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800`}>Suggestion</span>}
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
                    </ul>
                )
            ) : mode === "adherents" ? (
                adherentsFiltres.length === 0 ? (
                    <EtatVide texte={config.texteVide} />
                ) : (
                    <ul className="flex flex-col gap-2">
                        {adherentsFiltres.map((a, key) => (
                            <li key={key} className="flex items-center gap-4 rounded-xl border border-club-100 bg-white px-4 py-3 transition hover:border-club-200">
                                {/* Avatar (initiales) */}
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-club-50 text-sm font-semibold text-club-600">
                                    {a.cheminTrombinoscope ? (
                                        <img src={"/utilisateurs/photo/" + a.cheminTrombinoscope} alt={`Photo de ${a.prenom} ${a.nom}`} className="h-full w-full object-cover" />
                                    ) : (
                                        a.nom.split(" ").map((mot) => mot[0]).join("").slice(0, 2).toUpperCase()
                                    )}
                                </div>
                                {/* Infos */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[#040F33]">{a.prenom} {a.nom}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className="flex items-center gap-1 text-xs text-[#0B2270]/50">
                                            <Mail size={11} />
                                            {a.mail}
                                        </span>
                                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${a.derniereConnexion ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                            {a.derniereConnexion ? <Users size={11} /> : <Clock size={11} />}
                                            {a.derniereConnexion ? "Actif" : "En attente"}
                                        </span>
                                        {a.derniereConnexion &&
                                            <span className="text-xs text-[#0B2270]/50">Connecté le {new Date(a.derniereConnexion).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex shrink-0 items-center gap-1">
                                    {!a.derniereConnexion && (
                                        <button type="button" aria-label="Renvoyer l'invitation" title="Renvoyer l'invitation" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalConfirmerRelance(a)}>
                                            <Mail size={16} />
                                        </button>
                                    )}
                                    {!a.cheminTrombinoscope &&
                                        <button type="button" aria-label="Ajouter une photo" title="Ajouter une photo" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalPhotoAdherent(a)}>
                                            <Camera size={16} />
                                        </button>}

                                    <button type="button" aria-label="Modifier l'utilisateur" title="Modifier l'utilisateur" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalActionsAdherents(a)}>
                                        <Settings size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            ) : mode === "specialistesSante" ?
                specialistesFiltres.length === 0 ? (
                    <EtatVide texte={config.texteVide} />
                ) : (
                    <ul className="flex flex-col gap-2">
                        {specialistesFiltres.map((a, key) => (
                            <li key={key} className="flex items-center gap-4 rounded-xl border border-club-100 bg-white px-4 py-3 transition hover:border-club-200">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-club-50">

                                    <div className="flex h-full w-full items-center justify-center text-club-300">
                                        <Stethoscope size={20} />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[#040F33]">{a.nom}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium`}>{ONGLETS_SPECIALISTE.find(o => o.value === a.specialite)?.label}</span>
                                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${a.etat === "valider" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                            {a.etat === "valider" ? <Globe size={11} /> : <FileText size={11} />}
                                            {a.etat === "valider" ? "Enregistré" : "Suggestion"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button aria-label="Modifier" title="Modifier" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalModifierSpecialiste(a)}>
                                        <Pencil size={16} />
                                    </button>
                                    <button type="button" onClick={() => setElementASupprimer(a.nom)} disabled={elementASupprimer === a.nom} aria-label="Supprimer" title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50">
                                        {elementASupprimer === a.nom ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )


                :

                <EtatVide texte={config.texteVide} />

            }

            {mode === "blog" && <ModalConfirmationSuppression titre="Supprimer l'article" texte={elementASupprimer} onFermer={() => setElementASupprimer(null)} setter={setArticles} urlApi="/articles/supprimer" />}
            {mode === "courses" && <ModalConfirmationSuppression titre="Supprimer la course" texte={elementASupprimer} onFermer={() => setElementASupprimer(null)} setter={setCourses} urlApi="/courses/supprimer" />}
            {mode === "adherents" && <ModalConfirmationSuppression titre="Supprimer l'adhérent" texte={elementASupprimer} onFermer={() => setElementASupprimer(null)} setter={setAdherents} urlApi="/utilisateurs/supprimer" />
            }
            {mode === "specialistesSante" && <ModalConfirmationSuppression titre="Supprimer le spécialiste" texte={elementASupprimer} onFermer={() => setElementASupprimer(null)} setter={setSpecialistesSante} urlApi="/specialistes/supprimer" />}

            {mode === "courses" && (
                <ModalNouvelleCourse
                    key={ancienneDonneesCourse?.nom ?? "nouvelle"}
                    ancienneDonnees={ancienneDonneesCourse}
                    ouvert={modalCourseOuvert}
                    onFermer={() => {
                        setModalCourseOuvert(false);
                        setAncienneDonneesCourse(undefined);
                    }}
                    setCourses={setCourses as React.Dispatch<React.SetStateAction<Course[]>>}
                    role={"administrateur"}
                />
            )}
            {mode === "adherents" &&
                <>
                    <ModalInviterAdherent
                        ouvert={modalInviterMembre !== null}
                        onFermer={() => setModalInviterMembre(null)}
                        setter={setAdherents}
                        adherent={(modalInviterMembre !== null &&
                            typeof modalInviterMembre === "object" &&
                            "id" in modalInviterMembre &&
                            "nom" in modalInviterMembre) ? modalInviterMembre : undefined}
                    />
                    <ModalPhotoAdherent adherent={modalPhotoAdherent} onFermer={() => setModalPhotoAdherent(null)} setAdherents={setAdherents} />


                    <ModalZipPhotos ouvert={modalImportPhotosZip} onFermer={() => setModalImportPhotosZip(false)} setAdherents={setAdherents} />

                    <ModalActionsAdherent ouvert={modalActionsAdherents !== null} onFermer={() => setModalActionsAdherents(null)} adherent={modalActionsAdherents} setAdherents={setAdherents} setModalInviterMembre={setModalInviterMembre} />

                    <ModalConfirmationRelance ouvert={!!modalConfirmerRelance} onFermer={() => setModalConfirmerRelance(null)} mail={modalConfirmerRelance?.mail} />
                </>
            }

            {mode == "specialistesSante" &&
                <ModalNouveauSpecialiste ouvert={!!modalModifierSpecialiste} onFermer={() => setModalModifierSpecialiste(null)} setSpecialistes={setSpecialistesSante} ancienneDonnees={modalModifierSpecialiste} />}
        </div>
    );
}

function EtatVide({ texte }: { texte: string }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-club-200 py-16 text-center">
            <Inbox size={28} className="text-[#0B2270]/30" />
            <p className="text-sm text-[#0B2270]/60">{texte}</p>
        </div>
    );
}