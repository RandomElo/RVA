export type Specialite = "kine" | "kine_sport" | "podologue" | "osteopathe" | "medecin_sport";

export type Specialiste = {
    nom: string;
    specialite: Specialite;
    detail: string;
    adresse: string;
    telephone?: string;
    lienReservation?: string;
    etat?: "suggestion" | "valider";
};

export const OPTIONS: { value: Specialite; label: string }[] = [
    { value: "kine_sport", label: "Kiné du sport" },
    { value: "kine", label: "Kiné" },
    { value: "podologue", label: "Podologue" },
    { value: "osteopathe", label: "Ostéopathe" },
    { value: "medecin_sport", label: "Médecin du sport" },
];
