import type { ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
    ouvert: boolean;
    titre: string;
    onFermer: () => void;
    children: ReactNode;
    largeurMax?: "sm" | "md" | "lg";
}

const LARGEURS = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
};

export default function Modal({ ouvert, titre, onFermer, children, largeurMax = "lg" }: Props) {
    if (!ouvert) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" onClick={onFermer}>
            <div className={`max-h-[90vh] w-full ${LARGEURS[largeurMax]} overflow-y-auto rounded-xl bg-white p-6 shadow-xl`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-club-700">{titre}</h2>
                    <button onClick={onFermer} className="text-club-400 hover:text-club-700" aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>

                <div className="mt-5">{children}</div>
            </div>
        </div>
    );
}
