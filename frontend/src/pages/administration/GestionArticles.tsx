/**
 * Back-office : liste des articles du blog (GET /articles/recuperer-tous-articles-admin).
 * La création et l'édition passent par la page de rédaction, sauf les albums photo (ModalModifierAlbum).
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, FileText, Globe, Loader2 } from "lucide-react";
import { LABEL_CATEGORIE, STYLE_BADGE, ONGLETS, type Categorie } from "../../constantes/types/blog";
import { useListeAdmin } from "../../fonctions/useListeAdmin";
import ListeAdministration from "./ListeAdministration";
import ModalConfirmationSuppression from "../../composants/modal/administration/ModalConfirmerSuppression";
import ModalModiferAlbum from "../../composants/modal/administration/ModalModifierAlbum";

type Statut = "brouillon" | "publie" | "suggestion";

type ArticleListe = {
    url: string;
    titre: string;
    categorie: Categorie;
    type: Statut;
    imageUrl?: string;
    datePublication: string; // yyyy-mm-dd
};

const ONGLETS_ARTICLES = [...ONGLETS, { value: "publie", label: "Publiés" }, { value: "brouillon", label: "Brouillons" }, { value: "suggestion", label: "Suggestions" }] as const;

function filtrerArticle(a: ArticleListe, onglet: string, recherche: string) {
    return (onglet === "tous" || a.categorie === onglet || a.type === onglet) && a.titre.toLowerCase().includes(recherche);
}

function comparerArticles(a: ArticleListe, b: ArticleListe) {
    return a.datePublication < b.datePublication ? 1 : -1;
}

export default function GestionArticles() {
    const { setDonnees, elementsFiltres, enChargement, onglet, setOnglet, recherche, setRecherche } = useListeAdmin<ArticleListe>({
        url: "/articles/recuperer-tous-articles-admin",
        filtrer: filtrerArticle,
        comparer: comparerArticles,
    });
    const [elementASupprimer, setElementASupprimer] = useState<string | null>(null);
    const [modalModifierAlbum, setModalModifierAlbum] = useState<string | null>(null);

    return (
        <ListeAdministration
            titreDocument="Gestion blog"
            titre="Articles"
            action={{ texte: "Nouvel article", lien: "/rediger-article" }}
            onglets={ONGLETS_ARTICLES}
            onglet={onglet}
            setOnglet={setOnglet}
            classeOnglets="max-w-150"
            recherche={recherche}
            setRecherche={setRecherche}
            placeholderRecherche="Rechercher un titre…"
            enChargement={enChargement}
            texteChargement="Chargement des articles…"
            estVide={elementsFiltres.length === 0}
            texteVide="Aucun article ne correspond à cette recherche."
            modales={
                <>
                    <ModalConfirmationSuppression titre="Supprimer l'article" texte={elementASupprimer} onFermer={() => setElementASupprimer(null)} setter={setDonnees} urlApi="/articles/supprimer" />
                    <ModalModiferAlbum ouvert={!!modalModifierAlbum} url={modalModifierAlbum} onFermer={() => setModalModifierAlbum(null)} />
                </>
            }
        >
            {elementsFiltres.map((a) => (
                <li key={a.url} className="flex items-center gap-4 rounded-xl border border-club-100 bg-white px-4 py-3 transition hover:border-club-200">
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
                                {a.type === "publie" ? "Publié" : a.type === "suggestion" ? "Suggestion" : "Brouillon"}
                            </span>
                            <span className="text-xs text-[#0B2270]/50">{new Date(a.datePublication).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {a.categorie === "album_photo" ? (
                            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalModifierAlbum(a.url)}>
                                <Pencil size={16} />
                            </button>
                        ) : (
                            <Link to={`/administration/modifier-article/${a.url}`} aria-label="Modifier" title="Modifier" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50">
                                <Pencil size={16} />
                            </Link>
                        )}

                        <button type="button" onClick={() => setElementASupprimer(a.titre)} disabled={elementASupprimer === a.titre} aria-label="Supprimer" title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50">
                            {elementASupprimer === a.titre ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                    </div>
                </li>
            ))}
        </ListeAdministration>
    );
}
