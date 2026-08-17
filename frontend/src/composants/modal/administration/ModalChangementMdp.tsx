import { useState } from "react";
import { useRequete } from "../../../fonctions/requete";
import Modal from "../Modal";
import ChampMdp from "../../ChampMdp";
import { useNotifications } from "../../../contexts/NotificationsContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

interface Props {
    ouvert: boolean;
    onFermer: () => void;
}

// Validation : 16 car. min, au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
const REGEX_MDP = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#+=])[A-Za-z\d@$!%*?&_\-#+=]{16,}$/;

export default function ModalChangementMdp({ ouvert, onFermer }: Props) {
    const [ancienMdp, setAncienMdp] = useState("");
    const [nouveauMdp, setNouveauMdp] = useState("");
    const [confirmationMdp, setConfirmationMdp] = useState("");

    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const requete = useRequete();
    const { deconnexion } = useAuth()
    const { notifier } = useNotifications()
    const navigation = useNavigate()


    if (!ouvert) return null;

    // Directives de validation individuelles pour le retour visuel
    const validations = {
        longueur: nouveauMdp.length >= 16,
        majuscule: /[A-Z]/.test(nouveauMdp),
        minuscule: /[a-z]/.test(nouveauMdp),
        chiffre: /\d/.test(nouveauMdp),
        special: /[@$!%*?&_\-#+=]/.test(nouveauMdp),
    };

    const estValide = REGEX_MDP.test(nouveauMdp);

    function reinitialiserEtFermer() {
        setAncienMdp("");
        setNouveauMdp("");
        setConfirmationMdp("");
        setErreur(null);
        onFermer();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErreur(null);

        if (!estValide) {
            setErreur("Le nouveau mot de passe ne respecte pas les critères de sécurité.");
            return;
        }

        if (nouveauMdp !== confirmationMdp) {
            setErreur("Les nouveaux mots de passe ne correspondent pas.");
            return;
        }

        setEnvoiEnCours(true);

        const resultat = await requete({
            url: "/utilisateurs/changement-mdp",
            methode: "POST",
            corps: {
                ancienMdp,
                nouveauMdp,
            },
        });

        if (resultat.changer) {
            notifier({ type: "succes", titre: "Succcès", description: resultat.detail })
            deconnexion();
            reinitialiserEtFermer()
            navigation("/connexion")
        } else {
            setErreur(resultat.detail);
        }


        setEnvoiEnCours(false);
    }

    return (
        <Modal ouvert={ouvert} titre="Changer de mot de passe" onFermer={reinitialiserEtFermer} largeurMax="sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {erreur && (
                    <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
                        {erreur}
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <ChampMdp mdp={ancienMdp} setMdp={setAncienMdp} id="ancienMdp" label="Ancien mot de passe" />
                </div>

                <div className="flex flex-col gap-1">
                    <ChampMdp mdp={nouveauMdp} setMdp={setNouveauMdp} id="nouveauMdp" label="Nouveau mot de passe" />

                    {/* Explications et critères de sécurité */}
                    <div className="mt-1.5 rounded-lg border border-club-100 bg-club-50/50 p-3 text-xs text-club-700">
                        <p className="font-semibold mb-1.5 text-club-900">Le mot de passe doit contenir :</p>
                        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            <li className={`flex items-center gap-1.5 ${validations.longueur ? "text-emerald-600 font-medium" : "text-club-700/60"}`}>
                                <span>{validations.longueur ? "✓" : "○"}</span> Au moins 16 caractères
                            </li>
                            <li className={`flex items-center gap-1.5 ${validations.majuscule ? "text-emerald-600 font-medium" : "text-club-700/60"}`}>
                                <span>{validations.majuscule ? "✓" : "○"}</span> 1 majuscule
                            </li>
                            <li className={`flex items-center gap-1.5 ${validations.minuscule ? "text-emerald-600 font-medium" : "text-club-700/60"}`}>
                                <span>{validations.minuscule ? "✓" : "○"}</span> 1 minuscule
                            </li>
                            <li className={`flex items-center gap-1.5 ${validations.chiffre ? "text-emerald-600 font-medium" : "text-club-700/60"}`}>
                                <span>{validations.chiffre ? "✓" : "○"}</span> 1 chiffre
                            </li>
                            <li className={`flex items-center gap-1.5 col-span-1 sm:col-span-2 ${validations.special ? "text-emerald-600 font-medium" : "text-club-700/60"}`}>
                                <span>{validations.special ? "✓" : "○"}</span> 1 caractère spécial (@$!%*?&_#+=...)
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <ChampMdp mdp={confirmationMdp} setMdp={setConfirmationMdp} id="confirmationNouveauMdp" label="Confirmer le nouveau mot de passe" />
                    {confirmationMdp && nouveauMdp !== confirmationMdp && (
                        <span className="text-[11px] font-medium text-red-500">Les mots de passe ne correspondent pas</span>
                    )}
                </div>

                <div className="mt-3 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={reinitialiserEtFermer}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={envoiEnCours || !estValide || nouveauMdp !== confirmationMdp}
                        className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {envoiEnCours ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            </form>

        </Modal>
    );
}