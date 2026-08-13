import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useRequete } from "../../fonctions/requete";
import { useNotifications } from "../../contexts/NotificationsContext";
import { Loader2 } from "lucide-react";
import Erreur404 from "../../composants/erreur/Erreur404";

type Textes = Record<string, string>;

export default function EditionTextesPage() {
    const params = useParams<{ "*": string }>();
    const nom = params["*"];

    const [textesOriginaux, setTextesOriginaux] = useState<Textes | null>(null);
    const [textesEnCours, setTextesEnCours] = useState<Textes | null>(null);
    const [chargement, setChargement] = useState<boolean>(true);
    const [enregistrement, setEnregistrement] = useState<boolean>(false);
    // Pour chaque champ : true si son contenu déborde de la zone visible
    // (donc besoin de pouvoir l'agrandir), false sinon.
    const [besoinRedimensionnement, setBesoinRedimensionnement] = useState<Record<string, boolean>>({});

    const requete = useRequete();
    const { notifier } = useNotifications();
    const navigation = useNavigate();

    useEffect(() => {
        const chargerTextes = async (): Promise<void> => {
            if (!nom) {
                setChargement(false);
                return;
            }

            document.title = "Édition textes " + nom + " - Running Vincennes Association";
            setChargement(true);

            try {
                // Remplacement de TOUS les slashes par des underscores
                const nomFormate = nom.replace(/\//g, "_");
                const reponse = await requete({ url: `/pages/${nomFormate}/liste-textes-page` });

                if (reponse && Object.keys(reponse).length > 0) {
                    setTextesOriginaux(reponse);
                    setTextesEnCours(reponse);
                } else {
                    setTextesOriginaux(null);
                    setTextesEnCours(null);
                }
            } catch {
                setTextesOriginaux(null);
                setTextesEnCours(null);
            } finally {
                setChargement(false);
            }
        };

        chargerTextes();
    }, [nom]);

    const modifierChamp = (cle: string, valeur: string): void => {
        setTextesEnCours((precedent) => ({ ...precedent, [cle]: valeur }));
    };

    // Mesure si le texte affiché déborde de la hauteur visible du textarea.
    const mesurerDebordement = (cle: string, element: HTMLTextAreaElement): void => {
        const deborde = element.scrollHeight > element.clientHeight;
        setBesoinRedimensionnement((precedent) =>
            precedent[cle] === deborde ? precedent : { ...precedent, [cle]: deborde }
        );
    };

    const champsModifies: string[] = textesEnCours && textesOriginaux
        ? Object.keys(textesEnCours).filter(
            (cle) => textesEnCours[cle] !== textesOriginaux[cle]
        )
        : [];
    const aDesModifications: boolean = champsModifies.length > 0;

    const enregistrer = async (): Promise<void> => {
        if (!aDesModifications || !nom || !textesEnCours) return;
        setEnregistrement(true);

        const modifications: Textes = {};
        champsModifies.forEach((cle) => {
            modifications[cle] = textesEnCours[cle];
        });

        const nomFormate = nom.replace(/\//g, "_");
        const reponse = await requete({
            url: `/pages/${nomFormate}/modifier-textes-page`,
            methode: "POST",
            corps: { textes: modifications },
        });

        setTextesOriginaux(reponse);
        setEnregistrement(false);

        notifier({ type: "succes", titre: "Succès", description: "Textes enregistrés." });
        navigation("/" + (nom === "accueil" ? "" : reponse.chemin));
    };

    if (chargement) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 mx-auto text-sm text-[#0B2270]/60">
                <Loader2 size={18} className="animate-spin" />
                Chargement…
            </div>
        );
    }

    // Le test vérifie à présent correctement si les objets sont nulls ou non définis
    if (!chargement && (!textesEnCours || !textesOriginaux)) return <Erreur404 />;

    return (
        <div className="conteneurPage mx-auto max-w-3xl px-4 py-10 pb-28">
            <Link to="/administration/pages" className="font-body text-sm text-club-600 hover:text-club-700">
                ← Toutes les pages
            </Link>

            <h1 className="mt-3 font-display text-2xl font-semibold text-club-900">{nom}</h1>
            <p className="mt-1 font-body text-sm text-club-700">
                Modifiez le texte à droite. Le nom du champ à gauche est indicatif et ne peut
                pas être changé.
            </p>

            <div className="mt-8 space-y-4">
                {Object.keys(textesOriginaux ?? {}).map((cle) => {
                    const modifie = textesEnCours?.[cle] !== textesOriginaux?.[cle];
                    return (
                        <div
                            key={cle}
                            className={`grid grid-cols-1 gap-2 rounded-xl border p-4 transition sm:grid-cols-[220px_1fr] sm:gap-4 ${modifie ? "border-accent-300 bg-accent-100/30" : "border-club-100 bg-white"
                                }`}
                        >
                            <input
                                type="text"
                                value={cle}
                                disabled
                                className="inputStyle bg-club-50 font-mono text-xs text-club-700"
                            />
                            <textarea
                                value={textesEnCours?.[cle]}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    modifierChamp(cle, e.target.value);
                                    mesurerDebordement(cle, e.target);
                                }}
                                ref={(element) => {
                                    // Mesure une fois au montage (avant toute frappe),
                                    // pour un texte déjà long au chargement de la page.
                                    if (element && besoinRedimensionnement[cle] === undefined) {
                                        mesurerDebordement(cle, element);
                                    }
                                }}
                                rows={2}
                                className={`inputStyle font-body ${besoinRedimensionnement[cle] ? "resize-y" : "resize-none"
                                    }`}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="fixed inset-x-0 bottom-0 border-t border-club-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
                    <span className="font-body text-sm text-club-700">
                        {aDesModifications
                            ? `${champsModifies.length} champ${champsModifies.length > 1 ? "s" : ""} modifié${champsModifies.length > 1 ? "s" : ""}`
                            : "Aucune modification"}
                    </span>
                    <button
                        type="button"
                        onClick={enregistrer}
                        disabled={!aDesModifications || enregistrement}
                        className="rounded-lg bg-club-600 px-5 py-2 font-body text-sm font-medium text-white transition hover:bg-club-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {enregistrement ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            </div>
        </div>
    );
}