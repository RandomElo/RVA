/**
 * Modale d'actions admin sur un adhérent : modifier, exporter les données,
 * supprimer la photo du trombinoscope, supprimer l'adhérent.
 * Emplacement suggéré : src/composants/adherents/ModalActionsAdherent.tsx
 *
 * Usage : déclenchée depuis une ligne du tableau des adhérents
 * (ex. bouton "..." / icône Settings sur chaque ligne).
 *
 * Chaque action est présentée sous forme de card. Les actions destructrices
 * (supprimer la photo, supprimer l'adhérent) demandent une confirmation
 * inline avant exécution (pas de window.confirm).
 *
**/

import { useState } from "react";
import { Pencil, Download, ImageOff, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useRequete } from "../../../fonctions/requete";
import Modal from "../Modal";
import type { Adherent } from "../../../constantes/types/adherents";

type Props = {
    ouvert: boolean;
    onFermer: () => void;
    adherent: Adherent | null;
    setAdherents: React.Dispatch<React.SetStateAction<Adherent[] | null>>;
    setModalInviterMembre: React.Dispatch<React.SetStateAction<Adherent | boolean | null>>
};

type ActionId = "photo" | "adherent";

export default function ModalActionsAdherent({ ouvert, onFermer, adherent, setAdherents, setModalInviterMembre }: Props) {
    const [confirmation, setConfirmation] = useState<ActionId | null>(null);
    const [enCours, setEnCours] = useState<ActionId | "export" | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    const requete = useRequete();

    function reinitialiser() {
        setConfirmation(null);
        setEnCours(null);
        setErreur(null);
    }

    function fermer() {
        reinitialiser();
        onFermer();
    }

    async function handleExporter() {
        if (!adherent) return;
        setErreur(null);
        setEnCours("export");
        try {
            const blob = await requete({
                url: `/utilisateurs/exporter/${adherent.id}`,
                blob: true
            });

            const url = URL.createObjectURL(blob);
            const lien = document.createElement("a");
            lien.href = url;
            lien.download = `${adherent.prenom}_${adherent.nom}.zip`;
            document.body.appendChild(lien);
            lien.click();
            document.body.removeChild(lien);
            URL.revokeObjectURL(url);
        } catch {
            setErreur("Impossible d'exporter les données de cet adhérent.");
        } finally {
            setEnCours(null);
        }
    }

    async function handleSupprimerPhoto() {
        if (!adherent) return;
        setErreur(null);
        setEnCours("photo");
        try {
            const reponse: Adherent[] = await requete({
                url: `/utilisateurs/supprimer-photo`,
                methode: "DELETE",
                corps: { id: adherent.id }
            });

            setAdherents(reponse);
            fermer()
        } catch {
            setErreur("Impossible de supprimer la photo de cet adhérent.");
        } finally {
            setEnCours(null);
        }
    }

    async function handleSupprimerAdherent() {
        if (!adherent) return;
        setErreur(null);
        setEnCours("adherent");
        try {
            const resultat = await requete({ url: `/utilisateurs/supprimer`, methode: "DELETE", corps: { nom: adherent.mail } });
            setAdherents(resultat);
            fermer();
        } catch {
            setErreur("Impossible de supprimer cet adhérent.");
            setEnCours(null);
        }
    }

    if (!adherent) return null;

    const aUnePhoto = Boolean(adherent.cheminTrombinoscope);

    return (
        <Modal ouvert={ouvert} titre={`Adhérent : ${adherent.prenom} ${adherent.nom}`} onFermer={fermer}>
            <p className="text-sm text-club-900/70">Choisissez une action à effectuer pour cet adhérent.</p>

            {erreur && (
                <p className="mt-3 flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle size={16} />
                    {erreur}
                </p>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Modifier */}
                <button
                    type="button"
                    onClick={() => {
                        setModalInviterMembre(adherent)
                        fermer()
                    }}
                    className="group flex flex-col items-start gap-3 rounded-xl border border-club-100 p-4 text-left transition hover:-translate-y-0.5 hover:border-club-400 hover:shadow-md"
                >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-club-100 text-club-600 transition group-hover:bg-club-200">
                        <Pencil size={18} />
                    </span>
                    <span>
                        <span className="block font-display text-sm font-semibold text-club-900">Modifier</span>
                        <span className="block text-xs text-club-900/60">Éditer les informations de l'adhérent</span>
                    </span>
                </button>

                {/* Exporter les données */}
                <button
                    type="button"
                    onClick={handleExporter}
                    disabled={enCours === "export"}
                    className="group flex flex-col items-start gap-3 rounded-xl border border-club-100 p-4 text-left transition hover:-translate-y-0.5 hover:border-club-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-club-100 text-club-600 transition group-hover:bg-club-200">
                        {enCours === "export" ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </span>
                    <span>
                        <span className="block font-display text-sm font-semibold text-club-900">Exporter les données</span>
                        <span className="block text-xs text-club-900/60">Télécharger la fiche complète (CSV)</span>
                    </span>
                </button>

                {/* Supprimer la photo */}
                {confirmation === "photo" ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <span className="flex items-center gap-2 font-display text-sm font-semibold text-amber-800">
                            <AlertTriangle size={16} />
                            Supprimer la photo ?
                        </span>
                        <span className="text-xs text-amber-700/80">Cette action est irréversible.</span>
                        <div className="mt-1 flex gap-2">
                            <button type="button" onClick={() => setConfirmation(null)} className="flex-1 rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-100">
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSupprimerPhoto}
                                disabled={enCours === "photo"}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {enCours === "photo" ? <Loader2 size={14} className="animate-spin" /> : null}
                                Confirmer
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirmation("photo")}
                        disabled={!aUnePhoto}
                        className="group flex flex-col items-start gap-3 rounded-xl border border-club-100 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-club-100 disabled:hover:shadow-none"
                    >
                        <span className="flex size-10 items-center justify-center rounded-lg bg-club-100 text-amber-600 transition group-hover:bg-amber-100">
                            <ImageOff size={18} />
                        </span>
                        <span>
                            <span className="block font-display text-sm font-semibold text-club-900">Supprimer la photo</span>
                            <span className="block text-xs text-club-900/60">{aUnePhoto ? "Retirer la photo du trombinoscope" : "Aucune photo enregistrée"}</span>
                        </span>
                    </button>
                )}

                {/* Supprimer l'adhérent */}
                {confirmation === "adherent" ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4">
                        <span className="flex items-center gap-2 font-display text-sm font-semibold text-red-700">
                            <AlertTriangle size={16} />
                            Supprimer cet adhérent ?
                        </span>
                        <span className="text-xs text-red-600/80">Toutes ses données seront définitivement supprimées.</span>
                        <div className="mt-1 flex gap-2">
                            <button type="button" onClick={() => setConfirmation(null)} className="flex-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100">
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSupprimerAdherent}
                                disabled={enCours === "adherent"}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {enCours === "adherent" ? <Loader2 size={14} className="animate-spin" /> : null}
                                Confirmer
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirmation("adherent")}
                        className="group flex flex-col items-start gap-3 rounded-xl border border-club-100 p-4 text-left transition hover:-translate-y-0.5 hover:border-red-400 hover:shadow-md"
                    >
                        <span className="flex size-10 items-center justify-center rounded-lg bg-club-100 text-red-600 transition group-hover:bg-red-100">
                            <Trash2 size={18} />
                        </span>
                        <span>
                            <span className="block font-display text-sm font-semibold text-club-900">Supprimer l'adhérent</span>
                            <span className="block text-xs text-club-900/60">Retirer définitivement ce compte</span>
                        </span>
                    </button>
                )}
            </div>

            <div className="mt-6 flex justify-end">
                <button type="button" onClick={fermer} className="rounded-lg px-4 py-2.5 text-sm font-medium text-club-700 transition hover:bg-club-50 cursor-pointer">
                    Fermer
                </button>
            </div>
        </Modal>
    );
}