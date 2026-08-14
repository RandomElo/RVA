import { CheckCircle2, Heart } from "lucide-react";
import type { EtatInteressementUtilisateur } from "../../constantes/types/calendrier";

interface Props {
    estInteresse: boolean;
    participe: boolean,
    setEtat: (valeur: EtatInteressementUtilisateur) => void

}
export default function EtatInteressementAdherent({ estInteresse, participe, setEtat }: Props) {
    return <div className="flex w-full items-center gap-2 sm:w-auto">
        <button
            type="button"
            onClick={() => estInteresse ? setEtat(null) : setEtat("interesse")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition sm:flex-initial w-28.5 ${estInteresse
                ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
        >
            <Heart size={14} className={estInteresse ? "fill-rose-500 text-rose-500" : ""} />
            {estInteresse ? "Intéressé(e)" : "Intéressé"}
        </button>

        <button
            type="button"
            onClick={() => participe ? setEtat(null) : setEtat("participe")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition sm:flex-initial w-28.5 ${participe
                ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
                : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
        >
            <CheckCircle2 size={14} />
            {participe ? "Je participe !" : "Je participe"}
        </button>
    </div >
}