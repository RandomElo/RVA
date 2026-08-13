/**
 * Page publique : Contactez-nous.
 * Couvre le §2.1 du CDC : "Formulaire de contact / demande d'adhésion".
 */

import { useEffect, useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { useRequete } from "../../fonctions/requete";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import Captcha from "../../composants/Captcha";
import SEO from "../../composants/generale/SEO";

interface MessageContact {
    nom: string;
    mail: string;
    message: string;
}

interface ContactezNousJSON {
    titre: string;
    introduction: string;
}

// Données par défaut pour le SEO et le premier rendu instantané
const DONNEES_CONTACT_PAR_DEFAUT: ContactezNousJSON = {
    titre: "Contactez-nous",
    introduction: "Une question sur le club, envie de rejoindre une séance d'essai ? Écrivez-nous, on vous répond rapidement."
};

const VALEUR_INITIALE: MessageContact = { nom: "", mail: "", message: "" };

export default function Contact() {
    const [valeur, setValeur] = useState<MessageContact>(VALEUR_INITIALE);
    const [erreurs, setErreurs] = useState<Partial<Record<keyof MessageContact, string>>>({});
    const [erreur, setErreur] = useState<string>("");
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [messageEnvoye, setMessageEnvoye] = useState(false);
    const [contactezNousJSON, setContactezNousJSON] = useState<ContactezNousJSON>(DONNEES_CONTACT_PAR_DEFAUT);

    const [accesVerifier, setAccesVerifier] = useState<boolean>(false);
    const [afficherCaptcha, setAfficherCaptcha] = useState<boolean>(false);
    const [envoiEnAttente, setEnvoiEnAttente] = useState<boolean>(false);

    const requete = useRequete();
    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        async function recuperation() {
            try {
                const donnees = await requeteJSON("contactez-nous", (nouvellesDonnees) => {
                    if (nouvellesDonnees) {
                        setContactezNousJSON((prev) => ({ ...prev, ...nouvellesDonnees }));
                    }
                });
                if (donnees) {
                    setContactezNousJSON((prev) => ({ ...prev, ...donnees }));
                }
            } catch (error) {
                console.error("Erreur chargement Contact :", error);
            }
        }
        recuperation();
    }, []);

    // Dès que le captcha est validé, si un envoi était en attente, on le déclenche
    useEffect(() => {
        function verificationCanva() {
            if (accesVerifier && envoiEnAttente) {
                setAfficherCaptcha(false);
                setEnvoiEnAttente(false);
                envoyerMessage();
            }
        }
        verificationCanva()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accesVerifier]);

    function champ<K extends keyof MessageContact>(cle: K) {
        return (val: MessageContact[K]) => {
            setValeur((v) => ({ ...v, [cle]: val }));
            setErreurs((e) => ({ ...e, [cle]: undefined }));
        };
    }

    function valider(): boolean {
        const nouvellesErreurs: typeof erreurs = {};
        if (!valeur.nom.trim()) nouvellesErreurs.nom = "Votre nom est obligatoire.";
        if (!valeur.mail.trim()) nouvellesErreurs.mail = "Votre e-mail est obligatoire.";
        else if (!/^\S+@\S+\.\S+$/.test(valeur.mail)) nouvellesErreurs.mail = "Adresse e-mail invalide.";
        if (!valeur.message.trim()) nouvellesErreurs.message = "Le message ne peut pas être vide.";

        setErreurs(nouvellesErreurs);
        return Object.keys(nouvellesErreurs).length === 0;
    }

    async function envoyerMessage() {
        setEnvoiEnCours(true);
        setErreur("");
        try {
            const reponse = await requete({ url: "/autres/envoyer-mail-contact", methode: "POST", corps: valeur });
            if (reponse?.message) {
                setMessageEnvoye(true);
            } else {
                setErreur(reponse?.detail || "Une erreur s'est produite lors de l'envoi.");
            }
        } catch {
            setErreur("Impossible de contacter le serveur pour le moment.");
        } finally {
            setEnvoiEnCours(false);
        }
    }

    async function gererEnvoi(e: React.FormEvent) {
        e.preventDefault();
        if (!valider()) return;

        if (!accesVerifier) {
            // Le captcha n'a pas encore été validé : on l'affiche et on
            // mémorise qu'un envoi est en attente de validation.
            setEnvoiEnAttente(true);
            setAfficherCaptcha(true);
            return;
        }

        await envoyerMessage();
    }

    return (
        <>
            <SEO
                titre="Contact & Adhésion — Running Vincennes Association"
                description="Une question sur nos entraînements, nos cotisations ou l'inscription ? Contactez l'équipe de Running Vincennes Association, nous vous répondrons rapidement."
                chemin="/contactez-nous"
            />

            <div className="mx-auto max-w-5xl px-6 py-14">
                <header className="mb-10 max-w-xl">
                    <h1 className="mt-1 font-display text-3xl font-bold text-[#040F33] sm:text-4xl">
                        {contactezNousJSON.titre}
                    </h1>
                    <p className="mt-2 text-[#0B2270]/70">
                        {contactezNousJSON.introduction}
                    </p>
                </header>

                <div className="gap-10">
                    {!messageEnvoye ? (
                        <form onSubmit={gererEnvoi} className="flex flex-col gap-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="nom" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                                        Nom
                                    </label>
                                    <input
                                        id="nom"
                                        type="text"
                                        value={valeur.nom}
                                        onChange={(e) => champ("nom")(e.target.value)}
                                        placeholder="Votre nom"
                                        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 ${erreurs.nom ? "border-red-400" : "border-club-200"
                                            }`}
                                    />
                                    {erreurs.nom && <p className="mt-1 text-xs text-red-600">{erreurs.nom}</p>}
                                </div>

                                <div>
                                    <label htmlFor="mail" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                                        E-mail
                                    </label>
                                    <input
                                        id="mail"
                                        type="email"
                                        value={valeur.mail}
                                        onChange={(e) => champ("mail")(e.target.value)}
                                        placeholder="votre@mail.fr"
                                        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 ${erreurs.mail ? "border-red-400" : "border-club-200"
                                            }`}
                                    />
                                    {erreurs.mail && <p className="mt-1 text-xs text-red-600">{erreurs.mail}</p>}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    rows={6}
                                    value={valeur.message}
                                    onChange={(e) => champ("message")(e.target.value)}
                                    placeholder="Votre message…"
                                    className={`w-full resize-y rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 ${erreurs.message ? "border-red-400" : "border-club-200"
                                        }`}
                                />
                                {erreurs.message && <p className="mt-1 text-xs text-red-600">{erreurs.message}</p>}
                            </div>

                            {erreur && <p className="text-sm text-red-600">{erreur}</p>}

                            {/* Captcha affiché uniquement au moment de la tentative d'envoi */}
                            {afficherCaptcha && !accesVerifier && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                                        <Captcha setAccesVerifier={setAccesVerifier} />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAfficherCaptcha(false);
                                                setEnvoiEnAttente(false);
                                            }}
                                            className="mt-4 text-sm text-[#0B2270]/70 hover:underline"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={envoiEnCours}
                                className="flex items-center w-fit gap-2 ml-auto rounded-lg bg-accent-500 px-6 py-2.5 text-base font-medium text-white transition hover:bg-accent-700 disabled:opacity-60"
                            >
                                {envoiEnCours ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
                                Envoyer le message
                            </button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-start gap-2 rounded-xl border border-club-100 bg-club-50/60 p-8">
                            <CheckCircle2 size={32} className="text-club-600" />
                            <p className="font-display text-lg font-semibold text-[#040F33]">Message envoyé !</p>
                            <p className="text-sm text-[#0B2270]/70">
                                Merci {valeur.nom}, votre message a bien été transmis au bureau du club. On revient vers vous rapidement à l'adresse {valeur.mail}.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setValeur(VALEUR_INITIALE);
                                    setMessageEnvoye(false);
                                }}
                                className="mt-2 text-base font-medium text-club-600 hover:underline"
                            >
                                Envoyer un autre message
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}