// composants/helloasso/ModalNouveauFormHelloasso.tsx
//
// Modale de création (ou modification) d'un formulaire HelloAsso côté site.
// Inspirée de ModalNouvelleCourse.tsx : mêmes conventions (useRequete,
// useNotifications, style des champs, gestion d'erreur/envoi en cours).
//
// Fonctionnalités :
//  - Choix d'une catégorie parmi : adhésion, repas de Noël, textile, autre.
//  - Constructeur de champs personnalisés (texte, nombre, téléphone, email,
//    choix unique, choix multiple, case à cocher), avec gestion des options
//    pour les champs à choix.
//  - Image de couverture sélectionnée via la modale existante
//    ModalAjouterImage (mode "galerieEtNouvelleImage"), en utilisant son
//    callback `onImageSelectionnee` plutôt que l'insertion dans un éditeur
//    TipTap (qui reste donc optionnel côté ModalAjouterImage).
//
// Prérequis / hypothèses à ajuster si besoin :
//  1. GET /images renvoie { donnees: ImageSite[] } pour peupler la galerie
//     de ModalAjouterImage. Si l'endpoint réel diffère, adapter
//     `chargerImages` ci-dessous.
//  2. POST /formulaires/creer et POST /formulaires/modifier renvoient
//     { formulaire, notification, detail } où `detail` est soit la liste
//     complète mise à jour (création/modif réussie), soit un message
//     d'erreur (voir controleur associé).

import { useEffect, useState } from "react";
import { AlertCircle, ImageIcon, Plus, Trash2, X } from "lucide-react";
import Modal from "../Modal";
import { CATEGORIES_FORMULAIRE, TYPES_CHAMP_FORMULAIRE, champAvecOptions, type CategorieFormulaire, type ChampFormulaire, type FormulaireHelloAsso, type HelloAssoForm, type TypeChampFormulaire } from "../../../constantes/types/helloasso";
import type { ImageSite } from "../../../constantes/types/blog";
import { useRequete } from "../../../fonctions/requete";
import { useNotifications } from "../../../contexts/NotificationsContext";
import ModalAjouterImage from "../blog/ModalAjouterImage";

interface Props {
    ouvert: boolean;
    onFermer: () => void;
    ancienneDonnees?: FormulaireHelloAsso;
    setFormulaires: React.Dispatch<React.SetStateAction<HelloAssoForm[]>>;
}

const CHAMPS_INITIAUX: FormulaireHelloAsso = {
    nom: "",
    categorie: "adhesion",
    description: "",
    image: null,
    champs: []
};

function idAleatoire(): string {
    return Math.random().toString(36).slice(2, 10);
}

export default function ModalNouveauFormHelloasso({ ouvert, onFermer, ancienneDonnees, setFormulaires }: Props) {
    const [champs, setChamps] = useState<FormulaireHelloAsso>(ancienneDonnees ?? CHAMPS_INITIAUX);
    const [envoiEnCours, setEnvoiEnCours] = useState<boolean>(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const [modalImageOuverte, setModalImageOuverte] = useState(false);
    const [imagesGalerie, setImagesGalerie] = useState<ImageSite[]>([]);

    const requete = useRequete();
    const { notifier } = useNotifications();

    useEffect(() => {
        if (ouvert) {
            setChamps(ancienneDonnees ?? CHAMPS_INITIAUX);
            setErreur(null);
        }
    }, [ouvert, ancienneDonnees]);

    useEffect(() => {
        async function chargerImages() {
            try {
                const resultat = await requete({ url: "/images", methode: "GET" });
                setImagesGalerie(resultat?.donnees ?? []);
            } catch (e) {
                console.error(e);
            }
        }
        if (modalImageOuverte) {
            chargerImages();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modalImageOuverte]);

    function mettreAJour<K extends keyof FormulaireHelloAsso>(cle: K, valeur: FormulaireHelloAsso[K]) {
        setChamps((precedent) => ({ ...precedent, [cle]: valeur }));
    }

    // --- Gestion des champs personnalisés du formulaire ---

    function ajouterChamp() {
        const nouveauChamp: ChampFormulaire = {
            id: idAleatoire(),
            label: "",
            type: "texte",
            obligatoire: false
        };
        setChamps((precedent) => ({ ...precedent, champs: [...precedent.champs, nouveauChamp] }));
    }

    function supprimerChamp(id: string) {
        setChamps((precedent) => ({ ...precedent, champs: precedent.champs.filter((c) => c.id !== id) }));
    }

    function mettreAJourChamp<K extends keyof ChampFormulaire>(id: string, cle: K, valeur: ChampFormulaire[K]) {
        setChamps((precedent) => ({
            ...precedent,
            champs: precedent.champs.map((c) => {
                if (c.id !== id) return c;
                const misAJour = { ...c, [cle]: valeur };
                // Initialise une liste d'options vide dès qu'on passe sur un type à choix.
                if (cle === "type" && champAvecOptions(valeur as TypeChampFormulaire) && !misAJour.options) {
                    misAJour.options = [""];
                }
                return misAJour;
            })
        }));
    }

    function ajouterOption(idChamp: string) {
        setChamps((precedent) => ({
            ...precedent,
            champs: precedent.champs.map((c) => (c.id === idChamp ? { ...c, options: [...(c.options ?? []), ""] } : c))
        }));
    }

    function mettreAJourOption(idChamp: string, index: number, valeur: string) {
        setChamps((precedent) => ({
            ...precedent,
            champs: precedent.champs.map((c) => {
                if (c.id !== idChamp) return c;
                const options = [...(c.options ?? [])];
                options[index] = valeur;
                return { ...c, options };
            })
        }));
    }

    function supprimerOption(idChamp: string, index: number) {
        setChamps((precedent) => ({
            ...precedent,
            champs: precedent.champs.map((c) =>
                c.id === idChamp ? { ...c, options: (c.options ?? []).filter((_, i) => i !== index) } : c
            )
        }));
    }

    // --- Image de couverture ---

    function imageSelectionnee(url: string, alt: string) {
        mettreAJour("image", { chemin: url, alt });
        setModalImageOuverte(false);
    }

    function retirerImage() {
        mettreAJour("image", null);
    }

    // --- Validation & envoi ---

    function validerAvantEnvoi(): string | null {
        if (!champs.nom.trim()) return "Le nom du formulaire est obligatoire.";
        for (const c of champs.champs) {
            if (!c.label.trim()) return "Chaque champ personnalisé doit avoir un intitulé.";
            if (champAvecOptions(c.type)) {
                const optionsValides = (c.options ?? []).map((o) => o.trim()).filter(Boolean);
                if (optionsValides.length < 2) return `Le champ « ${c.label} » doit avoir au moins deux options.`;
            }
        }
        return null;
    }

    async function envoyer(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();

        const erreurValidation = validerAvantEnvoi();
        if (erreurValidation) {
            setErreur(erreurValidation);
            return;
        }

        setEnvoiEnCours(true);
        setErreur(null);

        const url = ancienneDonnees ? "/helloasso/modifier" : "/helloasso/creer";

        // Nettoyage : on retire les options vides avant l'envoi.
        const corps: FormulaireHelloAsso = {
            ...champs,
            champs: champs.champs.map((c) => ({
                ...c,
                options: champAvecOptions(c.type) ? (c.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined
            }))
        };

        const resultat = await requete({ url, methode: "POST", corps });

        if (resultat?.formulaire) {
            notifier({ type: "succes", titre: "Succès", description: resultat.notification });
            setFormulaires(resultat.detail);
            setChamps(CHAMPS_INITIAUX);
            setEnvoiEnCours(false);
            onFermer();
        } else {
            setErreur(resultat?.detail ?? "Une erreur est survenue.");
            setEnvoiEnCours(false);
        }
    }

    return (
        <>
            <Modal ouvert={ouvert} titre={ancienneDonnees ? "Modifier le formulaire" : "Nouveau formulaire"} onFermer={onFermer}>
                <form onSubmit={envoyer} className="flex flex-col gap-4">
                    <Champ label="Nom du formulaire">
                        <input required value={champs.nom} onChange={(e) => mettreAJour("nom", e.target.value)} className="inputStyle" placeholder="Adhésion 2026/2027" />
                    </Champ>

                    <Champ label="Catégorie">
                        <select value={champs.categorie} onChange={(e) => mettreAJour("categorie", e.target.value as CategorieFormulaire)} className="inputStyle">
                            {CATEGORIES_FORMULAIRE.map((cat) => (
                                <option key={cat.valeur} value={cat.valeur}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </Champ>

                    <Champ label="Description (optionnel)">
                        <textarea
                            value={champs.description ?? ""}
                            onChange={(e) => mettreAJour("description", e.target.value)}
                            className="inputStyle min-h-20 resize-y"
                            placeholder="Quelques lignes présentant le formulaire…"
                        />
                    </Champ>

                    <Champ label="Image de couverture (optionnel)">
                        {champs.image ? (
                            <div className="relative w-fit">
                                <img src={champs.image.chemin} alt={champs.image.alt} className="h-32 w-32 rounded-lg object-cover" />
                                <button
                                    type="button"
                                    onClick={retirerImage}
                                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-club-900 text-white shadow-sm hover:bg-red-600"
                                    aria-label="Retirer l'image"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setModalImageOuverte(true)}
                                className="flex w-fit items-center gap-2 rounded-lg border border-dashed border-club-300 px-4 py-2 text-sm font-medium text-club-700 transition hover:border-club-500 hover:bg-club-50"
                            >
                                <ImageIcon size={16} />
                                Choisir une image
                            </button>
                        )}
                    </Champ>

                    <div className="flex flex-col gap-3 rounded-lg border border-club-100 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-club-900">Champs personnalisés</span>
                            <button
                                type="button"
                                onClick={ajouterChamp}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-club-700 transition hover:bg-club-50"
                            >
                                <Plus size={14} />
                                Ajouter un champ
                            </button>
                        </div>

                        {champs.champs.length === 0 && <p className="text-sm text-club-900/50">Aucun champ personnalisé pour l'instant.</p>}

                        <div className="flex flex-col gap-3">
                            {champs.champs.map((c, index) => (
                                <div key={c.id} className="flex flex-col gap-2 rounded-lg bg-club-50 p-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            required
                                            value={c.label}
                                            onChange={(e) => mettreAJourChamp(c.id, "label", e.target.value)}
                                            className="inputStyle flex-1"
                                            placeholder={`Intitulé du champ ${index + 1}`}
                                        />
                                        <select
                                            value={c.type}
                                            onChange={(e) => mettreAJourChamp(c.id, "type", e.target.value as TypeChampFormulaire)}
                                            className="inputStyle w-40 shrink-0"
                                        >
                                            {TYPES_CHAMP_FORMULAIRE.map((t) => (
                                                <option key={t.valeur} value={t.valeur}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => supprimerChamp(c.id)}
                                            className="shrink-0 rounded-lg p-2 text-club-400 transition hover:bg-club-100 hover:text-red-600"
                                            aria-label="Supprimer ce champ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <label className="flex items-center gap-2 text-xs text-club-700">
                                        <input type="checkbox" checked={c.obligatoire} onChange={(e) => mettreAJourChamp(c.id, "obligatoire", e.target.checked)} />
                                        Champ obligatoire
                                    </label>

                                    {champAvecOptions(c.type) && (
                                        <div className="flex flex-col gap-1.5 pl-1">
                                            {(c.options ?? []).map((option, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        value={option}
                                                        onChange={(e) => mettreAJourOption(c.id, i, e.target.value)}
                                                        className="inputStyle flex-1"
                                                        placeholder={`Option ${i + 1}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => supprimerOption(c.id, i)}
                                                        className="shrink-0 rounded-lg p-1.5 text-club-400 transition hover:bg-club-100 hover:text-red-600"
                                                        aria-label="Supprimer cette option"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => ajouterOption(c.id)}
                                                className="flex w-fit items-center gap-1 text-xs font-medium text-club-600 hover:text-club-900"
                                            >
                                                <Plus size={12} />
                                                Ajouter une option
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {erreur && (
                        <div role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <p>{erreur}</p>
                        </div>
                    )}

                    <button type="submit" disabled={envoiEnCours} className="mt-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-club-700 disabled:opacity-60">
                        {envoiEnCours ? "Enregistrement…" : ancienneDonnees ? "Enregistrer les modifications" : "Créer le formulaire"}
                    </button>
                </form>
            </Modal>

            <ModalAjouterImage
                ouvert={modalImageOuverte}
                onFermer={() => setModalImageOuverte(false)}
                images={imagesGalerie}
                setImages={setImagesGalerie}
                type="galerieEtNouvelleImage"
                onImageSelectionnee={imageSelectionnee}
            />
        </>
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