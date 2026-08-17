import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

interface Props {
    mdp: string;
    setMdp: (valeur: string) => void;
    id: string;
    label?: string;
    srOnly?: boolean;
}

export default function ChampMdp({ mdp, setMdp, id, label = "Mot de passe", srOnly = false }: Props) {
    const [voirMdp, setVoirMdp] = useState<boolean>(false);

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className={`text-sm font-semibold text-club-700 ${srOnly ? "sr-only" : ""}`}>
                {label}
            </label>

            <div className="relative flex items-center">
                <Lock size={16} className="pointer-events-none absolute left-3 text-club-700/40" />

                <input
                    id={id}
                    type={voirMdp ? "text" : "password"}
                    autoComplete="off"
                    required
                    value={mdp}
                    onChange={(e) => setMdp(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-club-200 py-2.5 pl-9 pr-10 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                />

                <button
                    type="button"
                    onClick={() => setVoirMdp((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 text-club-700/40 transition hover:text-club-700 cursor-pointer"
                    aria-label={voirMdp ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                    {voirMdp ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
}