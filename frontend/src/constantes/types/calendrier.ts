export interface Course {
    id: number;
    nom: string;
    date: string; // format ISO (YYYY-MM-DD), DATEONLY côté back
    lieu: string;
    distance?: string;
    type: "5km" | "10km" | "Semi" | "Marathon" | "Route" | "Trail";
    lienWhatsapp?: string;
    lienSite?: string;
    lienInscription?: string;
    inscriptionsOuvertes: boolean;
    dateOuvertureInscription?: string; // ISO
    etat?: "valider" | "suggestion";
    etatInteressementUtilisateur: EtatInteressementUtilisateur;
    listePersonnes: ObjetInteressementAdherent[];
}
export const TYPE_STYLES: Record<Course["type"], string> = {
    "5km": "bg-club-50 text-club-700",
    "10km": "bg-club-50 text-club-700",
    Semi: "bg-club-50 text-club-700",
    Marathon: "bg-accent-100 text-accent-700",
    Route: "bg-club-50 text-club-700",
    Trail: "bg-club-50 text-club-700",
};

export type EtatInteressementUtilisateur = null | "participe" | "interesse";
export interface ObjetInteressementAdherent {
    id: number;
    nom: string;
    prenom: string;
    cheminTrombinoscope: "string";
    statut: EtatInteressementUtilisateur;
}
