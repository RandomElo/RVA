import { createContext, useContext } from "react";
import type { ContexteNotifications } from "../constantes/types/notifications";

export const Contexte = createContext<ContexteNotifications | null>(null);

export function useNotifications() {
    const contexte = useContext(Contexte);
    if (!contexte) throw new Error("useNotifications doit être utilisé dans un NotificationsProvider");
    return contexte;
}
