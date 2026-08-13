import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { ContexteNotifications, Notif, NotifInterne } from "../constantes/types/notifications"


const Contexte = createContext<ContexteNotifications | null>(null);

const DUREE_PAR_DEFAUT = 4000;
const DUREE_ANIMATION_SORTIE = 200;

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const [notifs, setNotifs] = useState<NotifInterne[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const fermer = useCallback((id: string) => {
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
        // déclenche l'animation de sortie avant de retirer réellement la notif
        setNotifs((liste) => liste.map((n) => (n.id === id ? { ...n, sortie: true } : n)));
        setTimeout(() => {
            setNotifs((liste) => liste.filter((n) => n.id !== id));
        }, DUREE_ANIMATION_SORTIE);
    }, []);

    const notifier = useCallback(
        (notif: Omit<Notif, "id">) => {
            const id = crypto.randomUUID();
            const duree = notif.duree ?? DUREE_PAR_DEFAUT;
            setNotifs((liste) => [...liste, { ...notif, id }]);

            if (duree > 0) {
                const timer = setTimeout(() => fermer(id), duree);
                timers.current.set(id, timer);
            }
            return id;
        },
        [fermer],
    );

    return <Contexte.Provider value={{ notifs, notifier, fermer }}>{children}</Contexte.Provider>;
}

export function useNotifications() {
    const contexte = useContext(Contexte);
    if (!contexte) throw new Error("useNotifications doit être utilisé dans un NotificationsProvider");
    return contexte;
}
