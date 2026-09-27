/**
 * Mise en page commune aux écrans de gestion du back-office (articles,
 * courses, adhérents, spécialistes) : lien retour, en-tête avec bouton
 * d'ajout, onglets, recherche, puis la liste (ou le chargement / l'état vide).
 * Les lignes (`<li>`) et les modales sont fournies par chaque écran.
 */

import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Loader2, Inbox } from "lucide-react";

const CLASSE_BOUTON_AJOUT = "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition bg-accent-500 hover:bg-accent-700";

type ActionAjout = { texte: string; lien: string } | { texte: string; onClick: () => void };

type Props = {
    /** Titre de l'onglet du navigateur (sans le suffixe du site). */
    titreDocument: string;
    titre: string;
    action: ActionAjout;
    onglets: readonly { value: string; label: string }[];
    onglet: string;
    setOnglet: (onglet: string) => void;
    /** Classes ajoutées à la barre d'onglets (ex. largeur max pour les nombreux onglets du blog). */
    classeOnglets?: string;
    recherche: string;
    setRecherche: (recherche: string) => void;
    placeholderRecherche: string;
    /** Contenu affiché entre les filtres et la liste. */
    barreSecondaire?: ReactNode;
    enChargement: boolean;
    texteChargement: string;
    estVide: boolean;
    texteVide: string;
    /** Lignes `<li>` de la liste. */
    children: ReactNode;
    /** Modales de l'écran, rendues après la liste. */
    modales?: ReactNode;
};

export default function ListeAdministration({ titreDocument, titre, action, onglets, onglet, setOnglet, classeOnglets, recherche, setRecherche, placeholderRecherche, barreSecondaire, enChargement, texteChargement, estVide, texteVide, children, modales }: Props) {
    useEffect(() => {
        document.title = `${titreDocument} - Running Vincennes Association`;
    }, [titreDocument]);

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
                    <h1 className="font-display text-2xl font-bold text-[#040F33] sm:text-3xl">{titre}</h1>
                </div>

                {"lien" in action ? (
                    <Link to={action.lien} className={CLASSE_BOUTON_AJOUT}>
                        <Plus size={18} />
                        {action.texte}
                    </Link>
                ) : (
                    <button type="button" onClick={action.onClick} className={CLASSE_BOUTON_AJOUT}>
                        <Plus size={18} />
                        {action.texte}
                    </button>
                )}
            </header>

            {/* Filtres */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <nav className={`flex flex-wrap gap-2${classeOnglets ? ` ${classeOnglets}` : ""}`}>
                    {onglets.map((o) => (
                        <button key={o.value} type="button" onClick={() => setOnglet(o.value)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${onglet === o.value ? "bg-club-600 text-white" : "bg-club-50 text-[#0B2270] hover:bg-club-100"}`}>
                            {o.label}
                        </button>
                    ))}
                </nav>
                <div className="relative w-full sm:w-64">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0B2270]/40" />

                    <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={placeholderRecherche} className="w-full rounded-lg border border-club-200 py-2 pl-9 pr-3 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200" />
                </div>
            </div>
            {barreSecondaire}

            {/* Liste */}
            {enChargement ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#0B2270]/60">
                    <Loader2 size={18} className="animate-spin" />
                    {texteChargement}
                </div>
            ) : estVide ? (
                <EtatVide texte={texteVide} />
            ) : (
                <ul className="flex flex-col gap-2">{children}</ul>
            )}

            {modales}
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
