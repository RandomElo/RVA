import { useEffect, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { useRequete } from "../../fonctions/requete";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

interface PersonneAnniversaire {
    id: number | string;
    prenom: string;
    nom: string;
}

const CLE_STOCKAGE = "bandeauAnniversaire_fermeLe";

/** Renvoie la date du jour au format AAAA-MM-JJ (stable, indépendant du fuseau d'affichage). */
function dateDuJour(): string {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
    const jour = String(maintenant.getDate()).padStart(2, "0");
    return `${annee}-${mois}-${jour}`;
}

export default function BandeauAnniversaire() {
    const [personnes, setPersonnes] = useState<PersonneAnniversaire[]>([]);
    const [ferme, setFerme] = useState(false);

    const requete = useRequete();
    const { estAuth } = useAuth();

    // Vérifie si l'utilisateur a déjà fermé le bandeau aujourd'hui
    useEffect(() => {
        const dateFermeture = localStorage.getItem(CLE_STOCKAGE);
        if (dateFermeture === dateDuJour()) {
            setFerme(true);
        }
    }, []);

    useEffect(() => {
        async function charger() {
            if (!estAuth) return;

            const donnees = await requete({ url: "/utilisateurs/anniversaires-du-jour" });
            setPersonnes(donnees ?? []);
        }
        charger();
    }, [estAuth]);

    function fermerBandeau() {
        localStorage.setItem(CLE_STOCKAGE, dateDuJour());
        setFerme(true);
    }

    if (!estAuth) return null;
    if (ferme) return null;
    if (personnes.length === 0) return null;

    const noms = personnes.map((p) => `${p.prenom} ${p.nom}`);
    const texte =
        noms.length === 1
            ? `Aujourd'hui c'est l'anniversaire de ${noms[0]} !`
            : `Aujourd'hui c'est l'anniversaire de ${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]} !`;

    const groupe = (
        <div className="flex shrink-0">
            {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="mx-8 inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-white sm:text-base">
                    <PartyPopper size={16} className="shrink-0" />
                    {texte}
                </span>
            ))}
        </div>
    );

    return (
        <div className="relative flex items-center gap-2 overflow-hidden bg-gradient-to-r from-accent-500 via-accent-700 to-accent-500 px-3 py-2">
            <Link
                to="/anniversaires"
                className="flex min-w-0 flex-1 overflow-hidden"
            >
                <div className="flex animate-[defilementBandeau_24s_linear_infinite] hover:[animation-play-state:paused]">
                    {groupe}
                    {groupe}
                </div>
            </Link>

            <button
                type="button"
                onClick={fermerBandeau}
                aria-label="Fermer le bandeau"
                className="shrink-0 cursor-pointer text-white/80 transition hover:text-white"
            >
                <X size={19} />
            </button>
        </div>
    );
}