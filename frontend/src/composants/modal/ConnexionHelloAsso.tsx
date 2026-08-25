import { useEffect, useState, useCallback } from "react";
import { useRequete } from "../../fonctions/requete";
import { CheckCircle2, XCircle, Loader2, LogIn } from "lucide-react";

const URL_API_BASE = import.meta.env.VITE_API_URL || ""; // adapte au nom de ta variable d'env existante

export default function ConnexionHelloAsso() {
    const requete = useRequete();
    const [connecte, setConnecte] = useState<boolean | null>(null);
    const [verification, setVerification] = useState<boolean>(true);
    const [connexionEnCours, setConnexionEnCours] = useState<boolean>(false);

    const verifierStatut = useCallback(async () => {
        setVerification(true);
        try {
            const reponse = await requete({ url: "/helloasso/statut-connexion" });
            setConnecte(Boolean(reponse?.connecte));
        } catch (erreur) {
            console.error("Erreur vérification statut HelloAsso :", erreur);
            setConnecte(false);
        } finally {
            setVerification(false);
        }
    }, []);

    useEffect(() => {
        verifierStatut();
    }, [verifierStatut]);

    // Écoute le message envoyé par la popup à la fin du flow OAuth
    useEffect(() => {
        function onMessage(event: MessageEvent) {
            if (event.origin !== window.location.origin.replace(window.location.port, "") && event.origin !== URL_API_BASE) {
                // Vérification souple : on filtre surtout sur le type du message ci-dessous
            }
            if (event.data?.type !== "helloasso-oauth") return;

            setConnexionEnCours(false);

            if (event.data.succes) {
                verifierStatut();
            } else {
                console.error("Connexion HelloAsso échouée :", event.data.message);
                alert(event.data.message || "La connexion à HelloAsso a échoué.");
            }
        }

        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [verifierStatut]);

    const ouvrirConnexion = () => {
        setConnexionEnCours(true);
        const popup = window.open(
            `${URL_API_BASE}/helloasso/login`,
            "helloasso_oauth",
            "width=600,height=700"
        );

        if (!popup) {
            setConnexionEnCours(false);
            alert("Merci d'autoriser les popups pour ce site afin de connecter HelloAsso.");
            return;
        }

        // Sécurité : si l'utilisateur ferme la popup sans terminer le flow
        const interval = setInterval(() => {
            if (popup.closed) {
                clearInterval(interval);
                setConnexionEnCours(false);
            }
        }, 500);
    };

    if (verification) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-2 border rounded-lg bg-gray-50">
                <Loader2 className="animate-spin" size={16} />
                Vérification de la connexion HelloAsso...
            </div>
        );
    }

    if (connecte) {
        return (
            <div className="flex items-center gap-2 text-sm text-green-700 px-4 py-2 border border-green-200 rounded-lg bg-green-50">
                <CheckCircle2 size={16} />
                Connecté à HelloAsso
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border border-amber-200 rounded-lg bg-amber-50">
            <div className="flex items-center gap-2 text-sm text-amber-800">
                <XCircle size={16} />
                Aucun administrateur HelloAsso n'est connecté. La création/modification de formulaires est indisponible.
            </div>
            <button
                onClick={ouvrirConnexion}
                disabled={connexionEnCours}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition"
            >
                {connexionEnCours ? <Loader2 className="animate-spin" size={14} /> : <LogIn size={14} />}
                {connexionEnCours ? "Connexion..." : "Connecter HelloAsso"}
            </button>
        </div>
    );
}