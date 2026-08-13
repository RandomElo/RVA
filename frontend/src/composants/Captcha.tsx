import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

interface Props {
    // Clé de site Turnstile (clé de TEST officielle Cloudflare par défaut, toujours valide)
    siteKey?: string;
    // Mode : 'invisible' pour exécution automatique ou 'managed' pour clic/défi visuel
    mode?: "invisible" | "managed";
    // Passée à true si la vérification réussit, à false en cas d'échec/expiration.
    setAccesVerifier: (verifie: boolean) => void;
}

type Etat = "chargement" | "verifie" | "erreur";

export default function Captcha({ siteKey = "1x00000000000000000000AA", mode = "invisible", setAccesVerifier }: Props) {
    const [etat, setEtat] = useState<Etat>("chargement");

    function gererSucces() {
        setEtat("verifie");
        setAccesVerifier(true);
    }

    function gererEchec() {
        setEtat("erreur");
        setAccesVerifier(false);
    }

    return (
        <div className="mx-auto my-10 flex max-w-sm flex-col items-center justify-center gap-3  bg-white px-6 py-8 text-center">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${etat === "erreur" ? "bg-red-50" : "bg-club-50"}`}>
                {etat === "chargement" && <Loader2 size={20} className="animate-spin text-club-600" />}
                {etat === "verifie" && <ShieldCheck size={20} className="text-club-600" />}
                {etat === "erreur" && <AlertTriangle size={20} className="text-red-600" />}
            </div>

            <div>
                <p className="font-display text-sm font-semibold text-club-900">Vérification de sécurité</p>
                <p className="mt-1 text-xs text-club-900/60">
                    {etat === "chargement" && "Analyse de la légitimité de votre requête…"}
                    {etat === "verifie" && "Vérification réussie."}
                    {etat === "erreur" && "Échec de la vérification. Merci de réessayer."}
                </p>
            </div>

            {mode === "managed" && (
                <div className="mt-1 flex justify-center">
                    <Turnstile
                        siteKey={siteKey}
                        options={{ action: "validation-lien-mail", theme: "light", size: "normal" }}
                        onSuccess={gererSucces}
                        onError={gererEchec}
                        onExpire={gererEchec}
                    />
                </div>
            )}

            {mode === "invisible" && (
                <Turnstile
                    siteKey={siteKey}
                    options={{ action: "validation-lien-mail", theme: "light", size: "invisible" }}
                    onSuccess={gererSucces}
                    onError={gererEchec}
                    onExpire={gererEchec}
                />
            )}

            {etat === "erreur" && (
                <div className="mt-1 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-700">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <p>Échec de la vérification de sécurité. Veuillez réessayer.</p>
                </div>
            )}
        </div>
    );
}