import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { KeyRound, Copy, Check, Loader2 } from "lucide-react";
import { useRequete } from "../fonctions/requete";
import { useNotifications } from "../contexts/NotificationsContext";
import { useAuth } from "../contexts/AuthContext";
import Captcha from "../composants/Captcha";

export default function Token() {
    const { token } = useParams();

    const [accesVerifier, setAccesVerifier] = useState<boolean>(false);
    const [afficherCodeConnexion, setAfficherCodeConnexion] = useState<string | null>(null);

    const requete = useRequete();
    const navigation = useNavigate();
    const { notifier } = useNotifications();
    const { verificationConnexion } = useAuth();

    useEffect(() => {
        async function traitementToken() {
            if (!token || !accesVerifier) return;
            
            const reponse = await requete({ url: "/autres/token", methode: "POST", corps: { token } });
            if (reponse.token) {
                if (reponse.detail.aAfficher) {
                    setAfficherCodeConnexion(reponse.detail.aAfficher);
                } else {
                    notifier({ type: "succes", titre: "Succès", description: reponse.detail });
                    await verificationConnexion();
                    navigation("/")
                };
            } else {
                notifier({ type: "erreur", titre: "Erreur avec le lien", description: reponse.detail });
                
                navigation("/");
            }
        }
        traitementToken();
    }, [token, accesVerifier]);


    return (
        <div className="flex min-h-[70vh] items-center justify-center px-6 py-16 mx-auto">
            {!accesVerifier ? (
                <Captcha setAccesVerifier={setAccesVerifier} />
            ) : afficherCodeConnexion ? (
                <CarteCodeConnexion code={afficherCodeConnexion} onContinuer={() => navigation("/")} />
            ) : (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-club-200 bg-white px-8 py-10 text-club-900/60 shadow-sm">
                    <Loader2 size={26} className="animate-spin text-club-600" />
                    <p className="text-sm">Vérification de votre lien de connexion…</p>
                </div>
            )}
        </div>
    );
}

function CarteCodeConnexion({ code, onContinuer }: { code: string; onContinuer: () => void }) {
    const [copie, setCopie] = useState(false);

    async function copier() {
        try {
            await navigator.clipboard.writeText(String(code));
            setCopie(true);
            setTimeout(() => setCopie(false), 2000);
        } catch {
            // Silencieux : le code reste affiché, l'utilisateur peut le recopier à la main.
        }
    }

    return (
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-club-200 bg-white px-6 py-8 text-center shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-club-50">
                <KeyRound size={20} className="text-club-600" />
            </div>

            <div>
                <p className="font-display text-sm font-semibold text-club-900">Votre code de connexion</p>
                <p className="mt-1 text-xs text-club-900/60">Renseignez ce code là où il vous est demandé.</p>
            </div>

            <button
                type="button"
                onClick={copier}
                title="Copier le code"
                className="group flex items-center gap-3 rounded-lg border border-club-200 bg-club-50 px-5 py-3 text-2xl font-semibold tracking-[0.3em] text-club-900 transition hover:border-club-400 cursor-pointer"
            >
                {code}
                {copie ? <Check size={16} className="text-club-600" /> : <Copy size={16} className="text-club-900/40 transition group-hover:text-club-600" />}
            </button>

            {copie && <p className="text-xs text-club-600">Code copié.</p>}

            <button type="button" onClick={onContinuer} className="mt-2 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 cursor-pointer">
                Continuer
            </button>
        </div>
    );
}