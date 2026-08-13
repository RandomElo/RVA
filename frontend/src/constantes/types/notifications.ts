export type TypeNotif = "succes" | "warn" | "erreur" | "info";

export type Notif = {
    id: string;
    type: TypeNotif;
    titre: string;
    description?: string;
    duree?: number; // ms avant fermeture auto, 0 = ne se ferme pas seule
};

export type NotifInterne = Notif & { sortie?: boolean };

export type ContexteNotifications = {
    notifs: NotifInterne[];
    notifier: (notif: Omit<Notif, "id">) => string;
    fermer: (id: string) => void;
};