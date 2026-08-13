import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useNotifications} from "../../contexts/NotificationsContext";
import type { JSX } from "react/jsx-runtime";
import type { TypeNotif } from "../../constantes/types/notifications";

const STYLES: Record<TypeNotif, { bg: string; texte: string; icone: JSX.Element }> = {
    succes: {
        bg: "bg-emerald-50",
        texte: "text-emerald-700",
        icone: <CheckCircle2 size={18} className="text-emerald-600" />,
    },
    warn: {
        bg: "bg-amber-50",
        texte: "text-amber-700",
        icone: <AlertTriangle size={18} className="text-amber-600" />,
    },
    erreur: {
        bg: "bg-red-50",
        texte: "text-red-700",
        icone: <XCircle size={18} className="text-red-600" />,
    },
    info: {
        bg: "bg-club-50",
        texte: "text-[#0B2270]",
        icone: <Info size={18} className="text-club-600" />,
    },
};

export default function Notifications() {
    const { notifs, fermer } = useNotifications();

    return (
        <div className="pointer-events-none fixed top-6 right-6 z-[1000] flex w-[320px] flex-col gap-3">
            {notifs.map((notif) => {
                const style = STYLES[notif.type];
                return (
                    <div key={notif.id} className={`pointer-events-auto relative flex items-start gap-3 rounded-xl border border-black/5 px-4 py-3.5 pr-8 shadow-lg shadow-black/5 ${style.bg} ${notif.sortie ? "animate-[sortieNotif_0.2s_ease_forwards]" : "animate-[entreeNotif_0.3s_ease]"}`}>
                        <div className="mt-0.5 shrink-0">{style.icone}</div>
                        <div className="flex flex-col gap-0.5">
                            <p className={`font-display text-[15px] font-semibold leading-tight ${style.texte}`}>{notif.titre}</p>
                            {notif.description && <p className={`text-[13px] leading-snug opacity-90 ${style.texte}`}>{notif.description}</p>}
                        </div>
                        <button type="button" onClick={() => fermer(notif.id)} className={`absolute right-2.5 top-2.5 cursor-pointer opacity-50 transition hover:text-red-600 hover:opacity-100 ${style.texte}`}>
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
