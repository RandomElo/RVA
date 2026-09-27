import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { Notif, NotifInterne } from "../constantes/types/notifications";
import { Contexte } from "./NotificationsContext";

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

    const valeur = useMemo(() => ({ notifs, notifier, fermer }), [notifs, notifier, fermer]);

    return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}
