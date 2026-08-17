/**
 * Page back-office : gestion des pages du site.
 *
 * Trois blocs :
 * 1. Arborescence des pages existantes (avec recherche/filtre), + bouton "Nouvelle page".
 *    Chaque nœud peut être déplié/replié, ouvert en édition, ou supprimé.
 * 2. (implicite) Le clic sur "Modifier" navigue vers le formulaire d'édition d'une page
 *    (route suggérée : /administration/pages/:id, sur le même principe que /administration/blog/:id).
 * 3. Bloc "Textes des pages créées en dur" : les textes statiques codés directement dans le
 *    front (hero d'accueil, footer, mentions légales…) plutôt que des pages dynamiques,
 *    listés à part avec leur propre édition.
 *
 */

import { useEffect, useMemo, useState } from "react";
import { Link, Link as RouterLink, useNavigate, type NavigateFunction } from "react-router-dom";
import { Plus, Search, ChevronRight, ChevronDown, Folder, Pencil, Trash2, FileEdit, ExternalLink, File, Code } from "lucide-react";

import ModalConfirmationSuppression from "../../composants/modal/administration/ModalConfirmerSuppression";
import { useRequete } from "../../fonctions/requete";

// --- Types ---

type PageArbre = {
    titre: string;
    chemin: string;
    modifiable: boolean;
    enfants: PageArbre[];
};

type TexteEnDur = {
    nom: string;
    chemin: string;
    nombreTextes: string;
};

// --- Filtrage de l'arborescence par terme de recherche ---

function normaliser(texte: string): string {
    return texte
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function filtrerArbre(noeuds: PageArbre[], terme: string): PageArbre[] {
    if (!terme.trim()) return noeuds;
    const termeNormalise = normaliser(terme);

    return noeuds.reduce<PageArbre[]>((resultat, noeud) => {
        const correspond = normaliser(noeud.titre).includes(termeNormalise) || normaliser(noeud.chemin).includes(termeNormalise);
        const enfantsFiltres = filtrerArbre(noeud.enfants, terme);

        if (correspond || enfantsFiltres.length > 0) {
            resultat.push({ ...noeud, enfants: enfantsFiltres });
        }
        return resultat;
    }, []);
}

function idsAvecEnfantsCorrespondants(noeuds: PageArbre[]): string[] {
    return noeuds.flatMap((noeud) =>
        noeud.enfants.length > 0
            ? [noeud.chemin, ...idsAvecEnfantsCorrespondants(noeud.enfants)]
            : []
    );
}
export default function GestionPages() {
    const [pages, setPages] = useState<PageArbre[]>([]);
    const [textesEnDur, setTextesEnDur] = useState<TexteEnDur[]>([]);
    const [recherche, setRecherche] = useState("");
    const [ouverts, setOuverts] = useState<Set<string>>(new Set());
    const [pageASupprimer, setPageASupprimer] = useState<PageArbre | null>(null);

    const navigation = useNavigate();
    const requete = useRequete()

    useEffect(() => {
        async function recuperationDonnees() {
            const reponse = await requete({ url: "/pages/recuperer-arboresence" })

            setPages(reponse.arborescence)
            setTextesEnDur(reponse.listePages)
            setOuverts(new Set(reponse.arborescence.map((p: PageArbre) => p.chemin)))
        }
        recuperationDonnees()
    }, []);

    const arbreFiltre = useMemo(() => filtrerArbre(pages, recherche), [pages, recherche]);

    // Pendant une recherche, on force le dépliage des branches qui contiennent un résultat,
    // pour ne pas cacher un enfant correspondant derrière un parent replié.
    const idsForcesOuverts = useMemo(() => (recherche.trim() ? new Set(idsAvecEnfantsCorrespondants(arbreFiltre)) : ouverts), [recherche, arbreFiltre, ouverts]);

    function basculerOuverture(chemin: string) {
        setOuverts((precedent) => {
            const nouveau = new Set(precedent);
            if (nouveau.has(chemin)) nouveau.delete(chemin);
            else nouveau.add(chemin);
            return nouveau;
        });
    }

    // --- Fonctions à brancher sur l'API ---

    function creerPage() {
        navigation("/administration/creation-page");
    }

    function demanderSuppressionPage(page: PageArbre) {
        setPageASupprimer(page);
    }

    return (
        <div className="conteneurPage mx-auto max-w-4xl px-4 py-6 sm:py-8">
            {/* Navigation Retour */}
            <div className="mb-3">
                <RouterLink
                    to="/administration"
                    className="font-body inline-flex items-center gap-1 text-sm text-club-600 transition hover:text-club-700"
                >
                    ← Interface administration
                </RouterLink>
            </div>

            {/* En-tête */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="font-display text-xl font-semibold text-club-900 sm:text-2xl">
                    Pages du site
                </h1>
                <button
                    type="button"
                    onClick={creerPage}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-club-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-club-700 sm:w-auto sm:py-2"
                >
                    <Plus size={16} />
                    Nouvelle page
                </button>
            </div>

            {/* Recherche */}
            <div className="relative mb-4">
                <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-club-900/40"
                />
                <input
                    type="text"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Rechercher une page par titre ou par url…"
                    className="w-full rounded-lg border border-club-200 py-2.5 pl-9 pr-3 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                />
            </div>

            {/* Arborescence */}
            <div className="mb-10 rounded-xl border border-club-100 bg-white p-2 shadow-sm sm:p-3">
                {arbreFiltre.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-club-900/50">
                        Aucune page ne correspond à votre recherche.
                    </p>
                ) : (
                    <ul className="flex flex-col">
                        {arbreFiltre.map((page) => (
                            <NoeudArborescence
                                key={page.chemin}
                                page={page}
                                niveau={0}
                                ouverts={idsForcesOuverts}
                                onBasculer={basculerOuverture}
                                onSupprimer={demanderSuppressionPage}
                                navigation={navigation}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {/* Textes des pages créées en dur */}
            <div>
                <h2 className="font-display mb-1 text-base font-semibold text-club-900 sm:text-lg">
                    Textes des pages créées en dur
                </h2>
                <p className="mb-4 text-xs text-club-900/60 sm:text-sm">
                    Certains textes du site (accueil, footer, mentions légales…) sont codés directement dans le front plutôt que gérés comme des pages dynamiques. Modifiez-les ici sans toucher au code.
                </p>

                <ul className="flex flex-col gap-2">
                    {textesEnDur.map((texte) => (
                        <li
                            key={texte.chemin}
                            className="flex flex-col items-start gap-3 rounded-xl border border-club-100 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:p-4"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-3 w-full sm:w-auto">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-club-50 text-club-600">
                                    <FileEdit size={18} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-club-900">
                                        {texte.nom}
                                    </p>
                                    <p className="truncate text-xs text-club-900/50">
                                        {texte.chemin}
                                    </p>
                                </div>
                            </div>

                            <div className="flex w-full items-center justify-between border-t border-club-50 pt-2 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0 gap-3">
                                <p className="text-xs text-club-900/40 sm:block max-w-[240px] truncate">
                                    {texte.nombreTextes} textes
                                </p>

                                <Link
                                    to={"/administration/edition-page" + (texte.chemin == "/" ? "/accueil" : texte.chemin)}
                                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-club-200 px-3 py-1.5 text-xs font-medium text-club-700 transition hover:bg-club-50"
                                >
                                    <Pencil size={13} />
                                    Modifier
                                </Link>
                            </div>
                        </li>
                    ))
                    }
                </ul >
            </div >

            <ModalConfirmationSuppression
                titre="Supprimer la page"
                texte={pageASupprimer?.titre ?? null}
                onFermer={() => setPageASupprimer(null)}
                urlApi="/pages/supprimer"
                setter={setPages}
            />
        </div >
    );
}

function NoeudArborescence({ page, niveau, ouverts, onBasculer, onSupprimer, navigation, }: { page: PageArbre; niveau: number; ouverts: Set<string> | undefined; onBasculer: (chemin: string) => void; onSupprimer: (page: PageArbre) => void; navigation: NavigateFunction; }) {
    const aDesEnfants = page.enfants.length > 0;
    const estOuvert = ouverts?.has(page.chemin);

    // Calcule un indent adaptatif plus petit sur mobile (12px par niveau) pour ne pas sortir de l'écran
    const paddingGaucheMobile = Math.min(niveau * 12 + 4, 48);
    const paddingGaucheDesktop = niveau * 20 + 8;

    return (
        <li>
            <div
                className="group flex min-h-[44px] items-center gap-1.5 rounded-lg py-1.5 pr-1.5 transition hover:bg-club-50 sm:gap-2 sm:px-2 sm:py-2"
                style={{
                    paddingLeft: `${typeof window !== "undefined" && window.innerWidth < 640
                        ? paddingGaucheMobile
                        : paddingGaucheDesktop
                        }px`,
                }}
            >
                {aDesEnfants ? (
                    <button
                        type="button"
                        onClick={() => onBasculer(page.chemin)}
                        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center text-club-900/40 hover:text-club-700"
                    >
                        {estOuvert ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                ) : (
                    <span className="h-6 w-6 shrink-0" />
                )}

                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${aDesEnfants
                        ? "bg-club-100 text-club-600"
                        : "bg-club-50 text-club-500"
                        }`}
                >
                    {aDesEnfants ? (
                        <Folder size={14} />
                    ) : page.modifiable ? (
                        <File size={14} />
                    ) : (
                        <Code size={14} />
                    )}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-club-900 sm:text-sm">
                        {page.titre}
                    </p>
                    <p className="truncate text-[11px] text-club-900/40 sm:text-xs">
                        {page.chemin}
                    </p>
                </div>

                {/* Action Bar: Toujours visible sur Mobile (tactile), survol sur Desktop */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition group-hover:opacity-100 sm:gap-1 sm:opacity-0">
                    <a
                        href={page.chemin}
                        target="_blank"
                        rel="noreferrer"
                        title="Voir la page"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-club-900/40 transition hover:bg-club-100 hover:text-club-700"
                    >
                        <ExternalLink size={14} />
                    </a>

                    <button
                        type="button"
                        onClick={() =>
                            !page.modifiable
                                ? navigation(`/administration/edition-page${page.chemin == "/" ? "/accueil" : page.chemin}`)
                                : navigation("/administration/modifier-page/" + page.chemin)
                        }
                        title="Modifier"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-club-900/40 transition hover:bg-club-100 hover:text-club-700"
                    >
                        <Pencil size={14} />
                    </button>

                    {page.modifiable && (
                        <button
                            type="button"
                            onClick={() => onSupprimer(page)}
                            title="Supprimer"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-club-900/40 transition hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {aDesEnfants && estOuvert && (
                <ul className="flex flex-col">
                    {page.enfants.map((enfant) => (
                        <NoeudArborescence
                            key={enfant.chemin}
                            page={enfant}
                            niveau={niveau + 1}
                            ouverts={ouverts}
                            onBasculer={onBasculer}
                            onSupprimer={onSupprimer}
                            navigation={navigation}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}