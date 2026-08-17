import { useState } from "react";
import { useRequete } from "../../../fonctions/requete";
import Modal from "../Modal";

interface Props {
    texte: string | null;
    titre: string;
    onFermer: () => void;
    setter: React.Dispatch<React.SetStateAction<any>>;
    urlApi: string;
}

export default function ModalConfirmationSuppression({titre, texte, onFermer, setter, urlApi }: Props) {
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const requete = useRequete();

    if (!texte) return null;

    async function confirmer() {
        setEnvoiEnCours(true);

        const resultat = await requete({ url: urlApi, methode: "DELETE", corps: { nom: texte } });

        setter(resultat);
        setEnvoiEnCours(false);
        onFermer();
    }

    return (
        <Modal ouvert={!!texte} titre={titre ?? "Supprimer l'élement"} onFermer={onFermer} largeurMax="sm">
            <p className="text-sm text-club-900/80">
                Es-tu sûr de vouloir supprimer <span className="font-semibold text-club-700">{texte}</span> ? Cette action est irréversible.
            </p>

            <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={onFermer} className="rounded-lg border border-club-100 px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                    Annuler
                </button>
                <button type="button" onClick={confirmer} disabled={envoiEnCours} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60">
                    {envoiEnCours ? "Suppression…" : "Supprimer"}
                </button>
            </div>
        </Modal>
    );
}
