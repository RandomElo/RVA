import { useEffect, useState } from "react";
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle, Lock, KeyRound } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import Google from "../../assets/google.svg?react";
import { useRequete } from "../../fonctions/requete";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Captcha from "../../composants/Captcha";
import Logo from "../../assets/logo.svg?react";
import ChampMdp from "../../composants/ChampMdp";
import GoogleAuthProvider from "../../contexts/GoogleAuthProvider";

const DELAI_AFFICHAGE_CODE_MS = 10_000;

// ----------------------------------------------------------------------
// Sous-composant isolé pour utiliser le hook useGoogleLogin à l'intérieur du Provider
// ----------------------------------------------------------------------
function BoutonGoogleLogin({ 
    enCours, 
    setEnCours, 
    setErreur 
}: { 
    enCours: boolean; 
    setEnCours: (b: boolean) => void; 
    setErreur: (e: { bloquante: boolean; detail: string } | null) => void;
}) {
    const requete = useRequete();
    const navigation = useNavigate();
    const { notifier } = useNotifications();
    const { verificationConnexion } = useAuth();

    async function gererConnexionGoogle(accessToken: string) {
        if (!accessToken) {
            notifier({ type: "erreur", titre: "Erreur", description: "Aucun jeton reçu." });
            return;
        }

        setEnCours(true);

        try {
            const reponse = await requete({
                url: "/utilisateurs/connexion-google",
                methode: "POST",
                corps: { token: accessToken },
            });

            if (reponse.token) {
                notifier({ type: "succes", titre: "Succès", description: reponse.detail });
                await verificationConnexion();
                navigation("/");
            }
        } catch (err) {
            notifier({ type: "erreur", titre: "Erreur", description: "Échec de la connexion Google." });
        } finally {
            setEnCours(false);
        }
    }

    const connexionGoogle = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            gererConnexionGoogle(tokenResponse.access_token);
        },
        onError: () => {
            setErreur({
                bloquante: true,
                detail: "Impossible de se connecter avec Google.",
            });
        },
    });

    return (
        <button
            type="button"
            onClick={() => connexionGoogle()}
            disabled={enCours}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-club-200 px-4 py-2.5 text-sm font-medium text-[#040F33] transition hover:border-club-400 hover:bg-club-50 disabled:opacity-60 cursor-pointer"
        >
            {enCours ? (
                <Loader2 className="animate-spin" size={15} />
            ) : (
                <>
                    <Google className="h-6 w-6 text-white" />
                    Continuer avec Google
                </>
            )}
        </button>
    );
}

// ----------------------------------------------------------------------
// Composant Principal
// ----------------------------------------------------------------------
export default function Connexion() {
    const [email, setEmail] = useState("");
    const [mdp, setMdp] = useState<string>("");
    const [enCours, setEnCours] = useState(false);
    const [lienEnvoye, setLienEnvoye] = useState(false);
    const [erreur, setErreur] = useState<{ bloquante: boolean; detail: string } | null>(null);
    const [authentificationSupplementaire, setAuthentificationSupplementaire] = useState<boolean>(false);
    const [accesVerifier, setAccesVerifier] = useState<boolean>(false);

    // --- Filet de secours "code de connexion" ---
    const [afficherChampCode, setAfficherChampCode] = useState(false);
    const [code, setCode] = useState("");
    const [envoiCodeEnCours, setEnvoiCodeEnCours] = useState(false);
    const [erreurCode, setErreurCode] = useState<string | null>(null);

    const requete = useRequete();
    const navigation = useNavigate();
    const { notifier } = useNotifications();
    const { verificationConnexion, role } = useAuth();

    useEffect(() => {
        document.title = "Connexion — Running Vincennes Association";
        if (role) {
            navigation("/");
        }
        if (!lienEnvoye) {
            setAfficherChampCode(false);
            return;
        }
        const delai = setTimeout(() => setAfficherChampCode(true), DELAI_AFFICHAGE_CODE_MS);
        return () => clearTimeout(delai);
    }, [lienEnvoye, role, navigation]);

    // --- Connexion par lien magique (e-mail) ---
    async function onEnvoyerLienConnexion(email: string) {
        const reponse = await requete({ url: "/utilisateurs/connexion-par-mail", methode: "POST", corps: { mail: email } });

        if (!reponse.compte) {
            if (reponse.detail === "Authentification supplémentaire") {
                setAuthentificationSupplementaire(true);
            } else {
                setErreur({ bloquante: true, detail: reponse.detail });
            }
        } else {
            setLienEnvoye(true);
        }
        setEnCours(false);
    }

    async function gererEnvoiLien(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        setEnCours(true);
        await onEnvoyerLienConnexion(email.trim());
    }

    async function onEnvoyerMdp(email: string, mdp: string) {
        const reponse = await requete({ url: "/utilisateurs/verification-mdp", methode: "POST", corps: { mail: email, mdp } });

        if (!reponse.compte) {
            if (reponse.detail === "Authentification supplémentaire") {
                setAuthentificationSupplementaire(true);
            } else {
                setErreur({ bloquante: true, detail: reponse.detail });
            }
        } else {
            setAuthentificationSupplementaire(false);
            setLienEnvoye(true);
        }
        setEnCours(false);
    }

    async function gererEnvoiMdp(e: React.FormEvent) {
        e.preventDefault();
        setEnCours(true);
        if (!mdp.trim()) setEnCours(false);
        await onEnvoyerMdp(email.trim(), mdp.trim());
    }

    // --- Saisie manuelle du code ---
    async function gererEnvoiCode(e: React.FormEvent) {
        e.preventDefault();
        if (!code.trim()) return;

        setErreurCode(null);
        setEnvoiCodeEnCours(true);
        try {
            const reponse = await requete({ url: "/utilisateurs/verification-code", methode: "POST", corps: { mail: email.trim(), code: code.trim() } });

            if (reponse.token) {
                notifier({ type: "succes", titre: "Succès", description: reponse.detail });
                await verificationConnexion();
                navigation("/");
            } else {
                notifier({ type: "erreur", titre: "Erreur", description: reponse.detail });
                setErreurCode(reponse.detail ?? "Code invalide, vérifiez votre saisie.");
            }
        } catch {
            setErreurCode("Impossible de vérifier ce code pour le moment.");
        } finally {
            setEnvoiCodeEnCours(false);
        }
    }

    if (!accesVerifier) {
        return <Captcha setAccesVerifier={setAccesVerifier} />;
    }

    return (
        <GoogleAuthProvider>
            <div className="conteneurPage flex min-h-[calc(100vh-140px)] items-center justify-center bg-club-50/40 px-6 py-16">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="mb-6 flex justify-center bg-club-600 w-30 mx-auto">
                        <Logo className="h-30" />
                    </div>

                    <div className="rounded-2xl border border-club-100 bg-white p-7 shadow-sm">
                        {/* En-tête */}
                        <div className="mb-6 text-center">
                            <h1 className="font-display text-2xl font-bold text-[#040F33]">Connexion</h1>
                            <p className="mt-2 text-sm text-[#0B2270]/70">
                                Connectez-vous avec votre compte Google ou par e-mail, avec l'adresse associée à votre compte membre.
                            </p>
                        </div>

                        {/* Option 1 — Google OAuth isolé */}
                        <BoutonGoogleLogin 
                            enCours={enCours} 
                            setEnCours={setEnCours} 
                            setErreur={setErreur} 
                        />

                        {/* Séparateur */}
                        <div className="my-5 flex items-center gap-3">
                            <span className="h-px flex-1 bg-club-100" />
                            <span className="text-xs text-[#0B2270]/40">ou</span>
                            <span className="h-px flex-1 bg-club-100" />
                        </div>

                        {/* Option 2 — E-mail / MDP / Code */}
                        {authentificationSupplementaire ? (
                            <>
                                <div className="flex flex-col items-center gap-2 rounded-lg bg-club-50 px-4 py-6 text-center mb-3">
                                    <Lock size={28} className="text-club-600" />
                                    <p className="text-sm font-medium text-[#040F33]">Mot de passe nécessaire</p>
                                    <p className="text-xs text-[#0B2270]/70">
                                        <span className="font-medium">{email}</span> nécessite de saisir le mot de passe pour se connecter
                                    </p>
                                </div>
                                <form onSubmit={gererEnvoiMdp} className="flex flex-col gap-2.5">
                                    <ChampMdp mdp={mdp} setMdp={setMdp} id="mdp" srOnly={true} />
                                    <button type="submit" disabled={enCours} className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270] disabled:opacity-60 cursor-pointer">
                                        {enCours ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                        Recevoir un code de connexion
                                    </button>
                                </form>
                            </>
                        ) : !lienEnvoye ? (
                            <form onSubmit={gererEnvoiLien} className="flex flex-col gap-2.5">
                                <label htmlFor="email" className="sr-only">Adresse e-mail</label>
                                <div className="relative">
                                    <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0B2270]/40" />
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="off"
                                        required
                                        value={email}
                                        onChange={(e) => {
                                            const valeur = e.target.value.trim();
                                            const regexMail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                                            if (valeur && !regexMail.test(valeur)) {
                                                setErreur({ bloquante: true, detail: "Adresse mail invalide." });
                                            } else {
                                                setErreur(null);
                                            }
                                            setEmail(e.target.value);
                                        }}
                                        placeholder="votre@email.fr"
                                        className="w-full rounded-lg border border-club-200 py-2.5 pl-9 pr-3 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                                    />
                                </div>
                                {erreur && (
                                    <p className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${erreur.bloquante ? "bg-red-50 text-red-700" : "bg-[#FAD1BE] text-[#A23A14]"}`}>
                                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                        {erreur.detail}
                                    </p>
                                )}
                                <button type="submit" disabled={enCours || erreur?.bloquante} className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270] disabled:opacity-60 cursor-pointer">
                                    {enCours ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                    Recevoir un code de connexion
                                </button>
                            </form>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col items-center gap-2 rounded-lg bg-club-50 px-4 py-6 text-center">
                                    <CheckCircle2 size={28} className="text-club-600" />
                                    <p className="text-sm font-medium text-[#040F33]">E-mail envoyé</p>
                                    <p className="text-xs text-[#0B2270]/70">
                                        Si <span className="font-medium">{email}</span> est autorisé, un code de connexion vient de vous être envoyé. Pensez à vérifier vos spams.
                                    </p>
                                    <button type="button" onClick={() => setLienEnvoye(false)} className="mt-1 text-xs font-medium text-club-600 hover:underline">
                                        Utiliser une autre adresse
                                    </button>
                                </div>

                                {afficherChampCode && (
                                    <form onSubmit={gererEnvoiCode} className="flex animate-[entreeNotif_0.25s_ease-out] flex-col gap-2.5 border-t border-club-100 pt-4">
                                        <p className="text-center text-xs text-[#0B2270]/60">Vous pouvez aussi saisir directement le code reçu par e-mail :</p>
                                        <label htmlFor="code" className="sr-only">Code de connexion</label>
                                        <div className="relative">
                                            <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0B2270]/40" />
                                            <input
                                                id="code"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                required
                                                value={code}
                                                onChange={(e) => {
                                                    setCode(e.target.value);
                                                    setErreurCode(null);
                                                }}
                                                placeholder="Code reçu par e-mail"
                                                className="w-full rounded-lg border border-club-200 py-2.5 pl-9 pr-3 text-center text-sm tracking-[0.2em] text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                                            />
                                        </div>

                                        {erreurCode && (
                                            <p className="flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                                {erreurCode}
                                            </p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={envoiCodeEnCours || !code.trim()}
                                            className="flex items-center justify-center gap-2 rounded-lg border border-club-600 px-4 py-2.5 text-sm font-medium text-club-600 transition hover:bg-club-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                        >
                                            {envoiCodeEnCours ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                            Valider le code
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </GoogleAuthProvider>
    );
}