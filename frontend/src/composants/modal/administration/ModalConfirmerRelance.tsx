import { useState } from "react";
import { Mail, Loader2, Send } from "lucide-react";
import { useRequete } from "../../../fonctions/requete";
import Modal from "../Modal";
import { useNotifications } from "../../../contexts/NotificationsContext";

interface Props {
    ouvert: boolean;
    mail: string | undefined;
    onFermer: () => void;
}

export default function ModalConfirmationRelance({ ouvert, mail, onFermer }: Props) {
    const [envoiEnCours, setEnvoiEnCours] = useState(false);

    const requete = useRequete();
    const { notifier } = useNotifications()
    async function confirmer() {
        setEnvoiEnCours(true);

        const resultat = await requete({ url: "/utilisateurs/relancer-mail-initialisation", methode: "POST", corps: { mail } });
        if (resultat.mail) {
            notifier({ type: "succes", titre: "Succès", description: resultat.detail })
        } else {
            notifier({ type: "erreur", titre: "Erreur", description: resultat.detail })
        }

        setEnvoiEnCours(false);
        onFermer();
    }

    return (
        <Modal ouvert={ouvert} titre="Envoyer une relance" onFermer={onFermer} largeurMax="sm">
            <div className="flex flex-col items-center gap-2 rounded-lg bg-club-50 px-4 py-6 text-center">
                <Mail size={26} className="text-club-600" />
                <p className="text-sm text-club-900/80">
                    Envoyer un mail de relance à <span className="font-semibold text-club-700">{mail}</span> ?
                </p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={onFermer} className="rounded-lg border border-club-100 px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                    Annuler
                </button>
                <button
                    type="button"
                    onClick={confirmer}
                    disabled={envoiEnCours}
                    className="flex items-center gap-2 rounded-lg bg-club-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-club-700 disabled:opacity-60"
                >
                    {envoiEnCours ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {envoiEnCours ? "Envoi…" : "Envoyer la relance"}
                </button>
            </div>
        </Modal>
    );
}