/**
 * Back-office : liste des spécialistes de santé (GET /specialistes/toutes-les-specialistes-admin).
 * L'ajout et la modification passent par ModalNouveauSpecialiste.
 */

import { useState } from "react";
import { Pencil, Trash2, FileText, Globe, Loader2, Stethoscope } from "lucide-react";
import type { Specialiste } from "../../constantes/types/specialistesSante";
import { useListeAdmin } from "../../fonctions/useListeAdmin";
import ListeAdministration from "./ListeAdministration";
import ModalConfirmationSuppression from "../../composants/modal/administration/ModalConfirmerSuppression";
import ModalNouveauSpecialiste from "../../composants/specialistesSante/ModalNouveauSpecialiste";

const ONGLETS_SPECIALISTE = [
    { value: "tous", label: "Tous" },
    { value: "suggestion", label: "Suggestion" },
    { value: "kine_sport", label: "Kiné du sport" },
    { value: "kine", label: "Kiné" },
    { value: "podologue", label: "Podologue" },
    { value: "osteopathe", label: "Ostéopathe" },
    { value: "medecin_sport", label: "Médecin du sport" },
] as const;

function filtrerSpecialiste(s: Specialiste, onglet: string, recherche: string) {
    const dansOnglet = onglet === "tous" || (onglet === "suggestion" ? s.etat === "suggestion" : s.specialite === onglet);
    return dansOnglet && s.nom.toLowerCase().includes(recherche);
}

export default function GestionSpecialistes() {
    const {
        setDonnees: setSpecialistes,
        elementsFiltres,
        enChargement,
        onglet,
        setOnglet,
        recherche,
        setRecherche,
    } = useListeAdmin<Specialiste>({
        url: "/specialistes/toutes-les-specialistes-admin",
        filtrer: filtrerSpecialiste,
    });
    const [elementASupprimer, setElementASupprimer] = useState<string | null>(null);
    const [modalModifierSpecialiste, setModalModifierSpecialiste] = useState<Specialiste | null>(null);
    const [modalAjouterSpecialiste, setModalAjouterSpecialiste] = useState<boolean>(false);

    return (
        <ListeAdministration
            titreDocument="Gestion spécialistes santé"
            titre="Spécialistes de santé"
            action={{ texte: "Ajouter des spécialistes", onClick: () => setModalAjouterSpecialiste(true) }}
            onglets={ONGLETS_SPECIALISTE}
            onglet={onglet}
            setOnglet={setOnglet}
            recherche={recherche}
            setRecherche={setRecherche}
            placeholderRecherche="Rechercher un nom…"
            enChargement={enChargement}
            texteChargement="Chargement des spécialistes…"
            estVide={elementsFiltres.length === 0}
            texteVide="Aucun spécialiste ne correspond à cette recherche."
            modales={
                <>
                    <ModalConfirmationSuppression titre="Supprimer le spécialiste" texte={elementASupprimer} onFermer={() => setElementASupprimer(null)} setter={setSpecialistes} urlApi="/specialistes/supprimer" />
                    <ModalNouveauSpecialiste ouvert={!!modalModifierSpecialiste} onFermer={() => setModalModifierSpecialiste(null)} setSpecialistes={setSpecialistes} ancienneDonnees={modalModifierSpecialiste} />
                    <ModalNouveauSpecialiste ouvert={modalAjouterSpecialiste} onFermer={() => setModalAjouterSpecialiste(false)} setSpecialistes={setSpecialistes} />
                </>
            }
        >
            {/* Le nom est unique en base (et sert déjà d'identifiant pour la suppression) */}
            {elementsFiltres.map((s) => (
                <li key={s.nom} className="flex items-center gap-4 rounded-xl border border-club-100 bg-white px-4 py-3 transition hover:border-club-200">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-club-50">
                        <div className="flex h-full w-full items-center justify-center text-club-300">
                            <Stethoscope size={20} />
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#040F33]">{s.nom}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium">{ONGLETS_SPECIALISTE.find((o) => o.value === s.specialite)?.label}</span>
                            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.etat === "valider" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                {s.etat === "valider" ? <Globe size={11} /> : <FileText size={11} />}
                                {s.etat === "valider" ? "Enregistré" : "Suggestion"}
                            </span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <button aria-label="Modifier" title="Modifier" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalModifierSpecialiste(s)}>
                            <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => setElementASupprimer(s.nom)} disabled={elementASupprimer === s.nom} aria-label="Supprimer" title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50">
                            {elementASupprimer === s.nom ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                    </div>
                </li>
            ))}
        </ListeAdministration>
    );
}
