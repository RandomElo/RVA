// composants/calendrier/ModalNouvelleCourse.tsx
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useRequete } from "../../fonctions/requete";
import Modal from "../modal/Modal";
import type { Course } from "../../constantes/types/calendrier";
import type { Role } from "../../constantes/types/auth";
import { useNotifications } from "../../contexts/NotificationsContext";

interface Props {
    ouvert: boolean;
    onFermer: () => void;
    ancienneDonnees?: Course;
    setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    role: Role
}

interface Champs {
    nom: string;
    date: string;
    lieu: string;
    distance?: string;
    type: "5km" | "10km" | "Semi" | "Marathon" | "Route" | "Trail";
    lienWhatsapp?: string;
    lienSite?: string;
    lienInscription?: string;
    inscriptionsOuvertes: boolean;
    dateOuvertureInscription?: string;
}

const CHAMPS_INITIAUX: Champs = {
    nom: "",
    date: "",
    lieu: "",
    type: "10km",
    distance: "",
    lienWhatsapp: "",
    lienSite: "",
    lienInscription: "",
    inscriptionsOuvertes: false,
    dateOuvertureInscription: "",
};

export default function ModalNouvelleCourse({ ancienneDonnees, ouvert, onFermer, setCourses, role }: Props) {
    const [champs, setChamps] = useState(ancienneDonnees ?? CHAMPS_INITIAUX);
    const [envoiEnCours, setEnvoiEnCours] = useState<boolean>(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const requete = useRequete();
    const { notifier } = useNotifications();

    function mettreAJour(cle: keyof typeof CHAMPS_INITIAUX, valeur: string | boolean) {
        setChamps((precedent) => ({ ...precedent, [cle]: valeur }));
    }

    async function envoyer(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setEnvoiEnCours(true);
        setErreur(null);

        let url = "/courses/cree";
        if (ancienneDonnees) {
            url = "/courses/modifier";
        }
        if (role == "adherent") {
            url = "/courses/suggestion";
        }


        const resultat = await requete({ url, methode: "POST", corps: champs });
        if (resultat.course) {
            if (role == "adherent") {
                notifier({ type: "succes", titre: "Succès", description: resultat.detail });

            } else {
                notifier({ type: "succes", titre: "Succès", description: resultat.notification });
                setCourses(resultat.detail);
                setChamps(CHAMPS_INITIAUX);
            }

            setEnvoiEnCours(false);

            onFermer();
        } else {
            setErreur(resultat.detail);
            setEnvoiEnCours(false);

        }
    }

    return (
        <Modal ouvert={ouvert} titre={role == "adherent" ? "Proposer une course" : ancienneDonnees ? "Modifier la course" : "Nouvelle course"} onFermer={onFermer}>
            <form onSubmit={envoyer} className="flex flex-col gap-4">
                <Champ label="Nom de la course">
                    <input required value={champs.nom} onChange={(e) => mettreAJour("nom", e.target.value)} className="inputStyle" placeholder="10 km de Vincennes" />
                </Champ>

                <Champ label="Date complète">
                    <input required type="date" value={champs.date} onChange={(e) => mettreAJour("date", e.target.value)} className="inputStyle" />
                </Champ>

                <Champ label="Type">
                    <select value={champs.type} onChange={(e) => mettreAJour("type", e.target.value)} className="inputStyle">
                        <option value="5km">5 km</option>
                        <option value="10km">10 km</option>
                        <option value="Semi">Semi</option>
                        <option value="Marathon">Marathon</option>
                        <option value="Route">Route (autre distance)</option>
                        <option value="Trail">Trail</option>
                    </select>
                </Champ>

                <div className="grid grid-cols-2 gap-4">
                    <Champ label="Lieu">
                        <input required value={champs.lieu} onChange={(e) => mettreAJour("lieu", e.target.value)} className="inputStyle" placeholder="Vincennes" />
                    </Champ>
                    {(champs.type === "Trail" || champs.type === "Route") && (
                        <Champ label="Distance">
                            <input required type="text" inputMode="decimal" pattern="^[0-9]+([.,][0-9]+)?$" value={champs.distance ?? ""} onChange={(e) => mettreAJour("distance", e.target.value)} className="inputStyle" placeholder="15 ou 21,1" />
                        </Champ>
                    )}
                </div>

                <Champ label="Site internet (optionnel)">
                    <input value={champs.lienSite ?? ""} onChange={(e) => mettreAJour("lienSite", e.target.value)} className="inputStyle" placeholder="https://..." />
                </Champ>

                <Champ label="Lien groupe WhatsApp (optionnel)">
                    <input value={champs.lienWhatsapp ?? ""} onChange={(e) => mettreAJour("lienWhatsapp", e.target.value)} className="inputStyle" placeholder="https://chat.whatsapp.com/..." />
                </Champ>

                <label className="flex items-center gap-2 text-sm text-club-900">
                    <input type="checkbox" checked={champs.inscriptionsOuvertes ?? ""} onChange={(e) => mettreAJour("inscriptionsOuvertes", e.target.checked)} />
                    Inscriptions déjà ouvertes
                </label>

                {champs.inscriptionsOuvertes ? (
                    <Champ label="Lien d'inscription">
                        <input required value={champs.lienInscription ?? ""} onChange={(e) => mettreAJour("lienInscription", e.target.value)} className="inputStyle" placeholder="https://..." />
                    </Champ>
                ) : (
                    <Champ label="Date ouverture d'inscription">
                        <input required type="date" value={champs.dateOuvertureInscription ?? ""} onChange={(e) => mettreAJour("dateOuvertureInscription", e.target.value)} className="inputStyle" />
                    </Champ>
                )}

                {erreur && (
                    <div role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{erreur}</p>
                    </div>
                )}

                <button type="submit" disabled={envoiEnCours} className="mt-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-club-700 disabled:opacity-60">
                    {role == "adherent" ? envoiEnCours ? "Envoi en cours…" : "Suggérer la course" : envoiEnCours ? "Ajout en cours…" : "Ajouter la course"}
                </button>
            </form>
        </Modal>
    );
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1 text-sm font-medium text-club-900">
            {label}
            {children}
        </label>
    );
}
