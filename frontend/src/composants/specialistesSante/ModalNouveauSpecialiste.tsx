// composants/annuaire/ModalNouveauSpecialiste.tsx
import { useEffect, useRef, useState } from "react";
import { AlertCircle, MapPin } from "lucide-react";
import { useRequete } from "../../fonctions/requete";
import Modal from "../modal/Modal";
import { OPTIONS, type Specialiste } from "../../constantes/types/specialistesSante";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationsContext";


interface Props {
    ouvert: boolean;
    onFermer: () => void;
    ancienneDonnees?: Specialiste | null;
    setSpecialistes: React.Dispatch<React.SetStateAction<Specialiste[] | null>>;
}

interface SuggestionAdresse {
    label: string;
}

const CHAMPS_INITIAUX: Specialiste = {
    nom: "",
    specialite: "kine_sport",
    detail: "",
    adresse: "",
    telephone: "",
    lienReservation: "",
};

const REGEX_TELEPHONE = /^(0|\+33\s?)[1-9](\s?\d{2}){4}$/;
const REGEX_URL = /^https?:\/\/.+/i;

export default function ModalNouveauSpecialiste({ ancienneDonnees, ouvert, onFermer, setSpecialistes }: Props) {
    const [champs, setChamps] = useState<Specialiste>(ancienneDonnees ?? CHAMPS_INITIAUX);
    const [erreursChamps, setErreursChamps] = useState<Partial<Record<keyof Specialiste, string>>>({});
    const [envoiEnCours, setEnvoiEnCours] = useState<boolean>(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const [suggestionsAdresse, setSuggestionsAdresse] = useState<SuggestionAdresse[]>([]);
    const [suggestionsOuvertes, setSuggestionsOuvertes] = useState(false);
    const [rechercheAdresseEnCours, setRechercheAdresseEnCours] = useState(false);
    const [adresseValidee, setAdresseValidee] = useState<boolean>(!!ancienneDonnees?.adresse);
    const delaiRecherche = useRef<ReturnType<typeof setTimeout> | null>(null);
    const conteneurAdresse = useRef<HTMLDivElement>(null);
    const inputAdresseRef = useRef<HTMLInputElement>(null);

    const requete = useRequete();
    const { role } = useAuth();
    const { notifier } = useNotifications();

    function mettreAJour(cle: keyof typeof CHAMPS_INITIAUX, valeur: string) {
        setChamps((precedent) => ({ ...precedent, [cle]: valeur }));
        if (erreursChamps[cle]) {
            setErreursChamps((precedent) => ({ ...precedent, [cle]: undefined }));
        }
    }

    // Fermer les suggestions au clic en dehors
    useEffect(() => {
        function surClicExterieur(e: MouseEvent) {
            if (conteneurAdresse.current && !conteneurAdresse.current.contains(e.target as Node)) {
                setSuggestionsOuvertes(false);
            }
        }
        document.addEventListener("mousedown", surClicExterieur);
        return () => document.removeEventListener("mousedown", surClicExterieur);
    }, []);
    // Synchronise les champs quand `ancienneDonnees` change (ex: ouverture de la modale
    // en édition alors que le composant est déjà monté) — useState seul ne suffit pas
    // car sa valeur initiale n'est prise en compte qu'au tout premier rendu.
    useEffect(() => {
        function gestion() {
            setChamps(ancienneDonnees ?? CHAMPS_INITIAUX);
            setAdresseValidee(!!ancienneDonnees?.adresse);
            setErreursChamps({});
            setErreur(null);
        }
        gestion()
    }, [ancienneDonnees, ouvert]);
    function surChangementAdresse(valeur: string) {
        mettreAJour("adresse", valeur);
        setAdresseValidee(false);

        if (delaiRecherche.current) clearTimeout(delaiRecherche.current);

        if (valeur.trim().length < 3) {
            setSuggestionsAdresse([]);
            setSuggestionsOuvertes(false);
            return;
        }

        delaiRecherche.current = setTimeout(async () => {
            setRechercheAdresseEnCours(true);
            try {
                const reponse = await fetch(
                    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(valeur)}&limit=5`
                );
                const donnees = await reponse.json();
                const resultats: SuggestionAdresse[] = (donnees.features ?? []).map((f: any) => ({
                    label: f.properties.label,
                }));
                setSuggestionsAdresse(resultats);
                setSuggestionsOuvertes(resultats.length > 0);
            } catch {
                setSuggestionsAdresse([]);
                setSuggestionsOuvertes(false);
            } finally {
                setRechercheAdresseEnCours(false);
            }
        }, 300);
    }

    function choisirSuggestion(suggestion: SuggestionAdresse) {
        mettreAJour("adresse", suggestion.label);
        setAdresseValidee(true);
        setSuggestionsOuvertes(false);
        setSuggestionsAdresse([]);
    }

    // Empêche de quitter le champ adresse tant qu'une suggestion n'a pas été sélectionnée
    function surBlurAdresse() {
        setTimeout(() => {
            if (champs.adresse.trim() && !adresseValidee) {
                setErreursChamps((precedent) => ({
                    ...precedent,
                    adresse: "Merci de sélectionner une adresse dans la liste.",
                }));
                inputAdresseRef.current?.focus();
                if (suggestionsAdresse.length > 0) setSuggestionsOuvertes(true);
            }
        }, 120);
    }

    function validerChamps(): boolean {
        const nouvellesErreurs: Partial<Record<keyof Specialiste, string>> = {};

        if (!champs.nom.trim()) nouvellesErreurs.nom = "Le nom est obligatoire.";

        if (!champs.detail.trim()) nouvellesErreurs.detail = "Merci de préciser les pratiques ou spécialités.";

        if (!champs.adresse.trim()) {
            nouvellesErreurs.adresse = "L'adresse est obligatoire.";
        } else if (!adresseValidee) {
            nouvellesErreurs.adresse = "Merci de sélectionner une adresse dans la liste.";
        }

        if (champs.telephone && !REGEX_TELEPHONE.test(champs.telephone.replace(/[.-]/g, " ").trim())) {
            nouvellesErreurs.telephone = "Numéro de téléphone invalide.";
        }

        if (champs.lienReservation && !REGEX_URL.test(champs.lienReservation.trim())) {
            nouvellesErreurs.lienReservation = "Le lien doit commencer par http:// ou https://";
        }

        setErreursChamps(nouvellesErreurs);
        return Object.keys(nouvellesErreurs).length === 0;
    }

    async function envoyer(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setErreur(null);

        if (!validerChamps()) return;

        setEnvoiEnCours(true);

        let url = "/specialistes/cree";
        if (ancienneDonnees) {
            url = "/specialistes/modifier";
        }
        if (role == "adherent") {
            url = "/specialistes/suggestion";
        }

        const resultat = await requete({ url, methode: "POST", corps: champs });
        if (resultat.specialiste) {
            setSpecialistes(resultat.detail);
            setChamps(CHAMPS_INITIAUX);
            setEnvoiEnCours(false);
            
            notifier({ type: "succes", titre: "Merci !", description: resultat.notification });

            onFermer();
        } else {
            setErreur(resultat.detail);
            setEnvoiEnCours(false);
        }
    }

    return (
        <Modal ouvert={ouvert} titre={ancienneDonnees ? "Modifier le spécialiste" : "Nouveau spécialiste"} onFermer={onFermer}>
            <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
                <Champ label="Nom du médecin / cabinet" erreur={erreursChamps.nom}>
                    <input
                        value={champs.nom}
                        onChange={(e) => mettreAJour("nom", e.target.value)}
                        className={`inputStyle ${erreursChamps.nom ? "border-red-400" : ""} `}
                        placeholder="Cabinet du Dr Martin"
                        disabled={!!ancienneDonnees}
                    />
                </Champ>

                <Champ label="Spécialité">
                    <select value={champs.specialite} onChange={(e) => mettreAJour("specialite", e.target.value)} className="inputStyle">
                        {OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </Champ>

                <Champ label="Pratiques / pourquoi le consulter" erreur={erreursChamps.detail}>
                    <textarea
                        rows={3}
                        value={champs.detail}
                        onChange={(e) => mettreAJour("detail", e.target.value)}
                        className={`inputStyle resize-none ${erreursChamps.detail ? "border-red-400" : ""}`}
                        placeholder="Suivi des blessures de course, préparation avant marathon, soins post-effort..."
                    />
                </Champ>

                <div ref={conteneurAdresse} className="relative">
                    <Champ label="Adresse" erreur={erreursChamps.adresse}>
                        <input
                            ref={inputAdresseRef}
                            value={champs.adresse}
                            onChange={(e) => surChangementAdresse(e.target.value)}
                            onFocus={() => suggestionsAdresse.length > 0 && setSuggestionsOuvertes(true)}
                            onBlur={surBlurAdresse}
                            autoComplete="off"
                            className={`inputStyle ${erreursChamps.adresse ? "border-red-400" : ""}`}
                            placeholder="12 rue de la République, Vincennes"
                        />
                    </Champ>

                    {suggestionsOuvertes && (
                        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                            {rechercheAdresseEnCours && (
                                <li className="px-3.5 py-2 text-sm text-gray-400">Recherche en cours…</li>
                            )}
                            {!rechercheAdresseEnCours &&
                                suggestionsAdresse.map((suggestion, i) => (
                                    <li key={i}>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => choisirSuggestion(suggestion)}
                                            className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-club-900 hover:bg-gray-50"
                                        >
                                            <MapPin size={14} className="shrink-0 text-gray-400" />
                                            <span className="truncate">{suggestion.label}</span>
                                        </button>
                                    </li>
                                ))}
                        </ul>
                    )}
                </div>

                <Champ label="Numéro de téléphone (optionnel)" erreur={erreursChamps.telephone}>
                    <input
                        value={champs.telephone ?? ""}
                        onChange={(e) => mettreAJour("telephone", e.target.value)}
                        className={`inputStyle ${erreursChamps.telephone ? "border-red-400" : ""}`}
                        placeholder="01 23 45 67 89"
                    />
                </Champ>

                <Champ label="Lien de réservation (optionnel)" erreur={erreursChamps.lienReservation}>
                    <input
                        value={champs.lienReservation ?? ""}
                        onChange={(e) => mettreAJour("lienReservation", e.target.value)}
                        className={`inputStyle ${erreursChamps.lienReservation ? "border-red-400" : ""}`}
                        placeholder="https://www.doctolib.fr/..."
                    />
                </Champ>

                {erreur && (
                    <div role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{erreur}</p>
                    </div>
                )}

                <button type="submit" disabled={envoiEnCours} className="mt-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-club-700 disabled:opacity-60">
                    {envoiEnCours ? (ancienneDonnees ? "Modification en cours…" : "Ajout en cours…") : ancienneDonnees ? "Modifier le spécialiste" : role == "adherent" ? "Suggérer le spécialiste" : "Ajouter le spécialiste"}
                </button>
            </form>
        </Modal>
    );
}

function Champ({ label, children, erreur }: { label: string; children: React.ReactNode; erreur?: string }) {
    return (
        <label className="flex flex-col gap-1 text-sm font-medium text-club-900">
            {label}
            {children}
            {erreur && (
                <span className="flex items-center gap-1 text-xs font-normal text-red-600">
                    <AlertCircle size={12} className="shrink-0" />
                    {erreur}
                </span>
            )}
        </label>
    );
}