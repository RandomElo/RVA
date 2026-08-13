/**
 * Modale d'ajout d'image dans l'éditeur (TipTap).
 * Emplacement suggéré : src/composants/editeur/ModalAjouterImage.tsx
 *
 * Deux modes, au choix via une bascule en haut de la modale :
 *   1. "Galerie" : sélection d'une image déjà existante sur le site.
 *   2. "Nouvelle image" : upload d'un fichier via drag & drop (comme
 *      ModalZipPhotos), avec un texte alternatif obligatoire.
 *
 * Dans les deux cas, la sélection/l'upload est confirmée par un bouton,
 * qui déclenche :
 *   editor.chain().focus().setImage({ src: url, alt }).run();
 * puis ferme la modale.
 *
 * Prérequis / hypothèses à ajuster si besoin :
 * 1. Adapter les chemins d'import de `Modal`, `useRequete` et `Editor`.
 * 2. Le modèle back-end expose au minimum { id, alt, nomFichier } par image
 *    (voir migration Sequelize fournie). Aucun champ `url` n'est garanti :
 *    l'URL affichée est donc reconstruite via CHEMIN_UPLOADS + nomFichier.
 *    → Si le back renvoie déjà une `url` complète, ajuste `getUrlImage`
 *      pour la préférer (déjà prévu ci-dessous).
 * 3. Endpoint : POST /image/ajouter
 *    (multipart/form-data, champs "image" (fichier) et "alt" (texte)) → renvoie,
 *    une fois déballé par useRequete (comme dans les autres modales) :
 *      { donnees: ImageSite[] }
 *    donnees : la liste complète des images du site à jour (nouvelle incluse).
 *    → Si l'endpoint renvoie autre chose (ex. juste la nouvelle image),
 *      adapte le bloc `envoyerImage` en conséquence.
 */

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, UploadCloud, Loader2, Upload, Check, TriangleAlert } from "lucide-react";
import type { Editor } from "@tiptap/react";
import Modal from "../Modal";
import { useRequete } from "../../../fonctions/requete";
import type { ImageSite } from "../../../constantes/types/blog";
import { useNotifications } from "../../../contexts/NotificationsContext";

// ⚠️ À ajuster selon la config réelle du projet (ex. variable d'env VITE_URL_BACK)
const CHEMIN_UPLOADS = "/images/i";


interface Props {
    ouvert: boolean;
    onFermer: () => void;
    editor: Editor;
    images: ImageSite[];
    setImages: React.Dispatch<React.SetStateAction<ImageSite[]>>;
    type: "galerieEtNouvelleImage" | "nouvelleImage" | "remplacerImage"
    ancienneDonnees?: ImageSite
}

type Mode = "galerie" | "ajouter";

type ReponseAjoutImage = {
    donnees: ImageSite[];
    notification: {
        titre: string;
        description: string;
    }
};

const EXTENSIONS_ACCEPTEES = [".jpg", ".jpeg", ".png", ".webp"];

function getUrlImage(image: ImageSite): string {
    return `${CHEMIN_UPLOADS}/${image.nomFichier}`;
}

export default function ModalAjouterImage({ ouvert, onFermer, editor, images, setImages, type, ancienneDonnees }: Props) {
    const [mode, setMode] = useState<Mode>();

    // --- Mode galerie ---
    const [imageSelectionnee, setImageSelectionnee] = useState<ImageSite | null>(null);

    // --- Mode upload ---
    const [fichier, setFichier] = useState<File | null>(null);
    const [apercu, setApercu] = useState<string | null>(null);
    const [alt, setAlt] = useState<string>("");
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [survole, setSurvole] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const requete = useRequete();
    const { notifier } = useNotifications()

    useEffect(() => {
        function calculMode() {
            if (type == "nouvelleImage" || type == "remplacerImage") {
                setMode("ajouter")
            } else {
                setMode("galerie")
            }
            if (type == "remplacerImage" && ancienneDonnees) {
                setAlt(ancienneDonnees.alt)
            }
        }
        calculMode()
    }, [type, ouvert]);

    function reinitialiser() {
        setMode("galerie");
        setImageSelectionnee(null);
        setFichier(null);
        setApercu(null);
        setAlt("");
        setErreur(null);
        setEnvoiEnCours(false);
        setSurvole(false);
    }

    function fermer() {
        reinitialiser();
        onFermer();
    }

    function changerMode(m: Mode) {
        setMode(m);
        setErreur(null);
    }

    function inserer(src: string, texteAlt: string) {
        editor.chain().focus().setImage({ src, alt: texteAlt }).run();
        fermer();
    }

    function confirmerGalerie() {
        if (!imageSelectionnee) return;
        inserer(getUrlImage(imageSelectionnee), imageSelectionnee.alt);
    }

    function choisirFichier(f: File | null) {
        setErreur(null);
        if (!f) {
            setFichier(null);
            setApercu(null);
            return;
        }
        const extensionValide = EXTENSIONS_ACCEPTEES.some((ext) => f.name.toLowerCase().endsWith(ext));
        if (!extensionValide) {
            setErreur("Formats acceptés : .jpg, .jpeg, .png, .webp.");
            return;
        }
        setFichier(f);
        setApercu(URL.createObjectURL(f));
    }

    function onDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setSurvole(false);
        choisirFichier(e.dataTransfer.files?.[0] ?? null);
    }

    async function envoyerImage() {
        if (!fichier) return;
        if (!alt.trim()) {
            setErreur("Merci de renseigner un texte alternatif pour cette image.");
            return;
        }

        setEnvoiEnCours(true);
        setErreur(null);
        try {
            const formData = new FormData();
            formData.append("image", fichier);
            formData.append("alt", alt.trim());
            if (type == "remplacerImage") {
                formData.append("nomFichier", ancienneDonnees!.nomFichier.trim());
            }
            const reponse: ReponseAjoutImage = await requete({
                url: type == "remplacerImage" ? "/images/remplacer" : "/images/ajouter?mode=" + (type == "galerieEtNouvelleImage" ? "galerie" : "tout"),
                methode: "POST",
                corps: formData,
                formData: true
            });

            setImages(reponse.donnees);

            notifier({ type: "succes", titre: reponse.notification.titre, description: reponse.notification.description })

            // La nouvelle image est censée être la dernière de la liste renvoyée.
            const nouvelleImage = reponse.donnees[reponse.donnees.length - 1];

            if (type == "remplacerImage") {
                setImages(reponse.donnees);
                window.location.reload()
                fermer();
            } else if (nouvelleImage) {
                inserer(getUrlImage(nouvelleImage), nouvelleImage.alt);
            } else {
                fermer();
            }
        } catch (e) {
            console.error(e)
            setErreur("Impossible d'importer l'image. Vérifiez le fichier et réessayez.");
        } finally {
            setEnvoiEnCours(false);
        }
    }

    return (
        <Modal ouvert={ouvert} titre={type == "remplacerImage" ? "Remplacer l'image" : "Ajouter une image"} onFermer={fermer} largeurMax="md">
            {type == "galerieEtNouvelleImage" &&

                <div className="mb-4 flex gap-1 rounded-lg bg-club-50 p-1">
                    <button
                        type="button"
                        onClick={() => changerMode("galerie")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition ${mode === "galerie" ? "bg-white text-club-900 shadow-sm" : "text-club-600 hover:text-club-900"} cursor-pointer`}
                    >
                        <ImageIcon size={14} />
                        Galerie
                    </button>
                    <button
                        type="button"
                        onClick={() => changerMode("ajouter")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition ${mode === "ajouter" ? "bg-white text-club-900 shadow-sm" : "text-club-600 hover:text-club-900"} cursor-pointer`}
                    >
                        <UploadCloud size={14} />
                        Nouvelle image
                    </button>
                </div>
            }

            {mode === "galerie" ? (
                <div className="flex flex-col gap-4">
                    {images.length === 0 ? (
                        <p className="py-8 text-center text-sm text-club-900/60">Aucune image sur le site pour le moment.</p>
                    ) : (
                        <div className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto pr-1">
                            {images.map((image, key) => {
                                const active = imageSelectionnee?.nomFichier === image.nomFichier;
                                return (
                                    <button
                                        type="button"
                                        key={key}
                                        onClick={() => setImageSelectionnee(image)}
                                        className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition cursor-pointer ${active ? "border-club-600" : "border-transparent hover:border-club-200"
                                            }`}
                                        title={image.alt}
                                    >
                                        <img
                                            src={getUrlImage(image)}
                                            alt={image.alt}
                                            className="h-full w-full object-cover"
                                        />

                                        {/* Badge de sélection si actif */}
                                        {active && (
                                            <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-club-600 text-white">
                                                <Check size={12} />
                                            </span>
                                        )}

                                        {/* Overlay avec le texte alt au survol (hover) */}
                                        {image.alt && (
                                            <span className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-center text-xs font-medium text-white opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 truncate">
                                                {image.alt}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={fermer} className="rounded-lg px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={confirmerGalerie}
                            disabled={!imageSelectionnee}
                            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Insérer l'image
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={EXTENSIONS_ACCEPTEES.join(",")}
                        className="hidden"
                        onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)}
                    />

                    <div
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => setSurvole(true)}
                        onDragLeave={() => setSurvole(false)}
                        onDrop={onDrop}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed py-6 text-center transition ${survole ? "border-club-500 bg-club-100" : "border-club-200 bg-club-50 hover:border-club-400"}`}
                    >
                        {apercu ? (
                            <img src={apercu} alt="Aperçu" className="max-h-40 rounded-lg object-contain" />
                        ) : (
                            <UploadCloud size={26} className="text-club-300" />
                        )}
                        {fichier ? <span className="text-sm font-medium text-club-700">{fichier.name}</span> : <span className="text-sm font-medium text-club-600">Cliquer ou glisser une image ici</span>}
                        <span className="text-xs text-club-900/50">.jpg, .jpeg, .png ou .webp</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="alt" className="text-sm font-medium text-club-700">
                            Texte alternatif
                        </label>
                        <input
                            id="alt"
                            type="text"
                            value={alt}
                            autoComplete="off"
                            disabled={type == "remplacerImage"}
                            onChange={(e) => setAlt(e.target.value)}
                            placeholder="Décrivez brièvement l'image"
                            className="inputStyle w-full rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                        />
                    </div>
                    {type === "remplacerImage" && (
                        <div className="flex gap-3 items-center">
                            <TriangleAlert size="19" className="shrink-0" color="red" />
                            <p className="text-sm">Le remplacement peut prendre quelques instants avant d’être visible sur tous les appareils.</p>
                        </div>
                    )}
                    {erreur && <p className="text-sm text-red-600">{erreur}</p>}

                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={fermer} className="rounded-lg px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={envoyerImage}
                            disabled={!fichier || !alt.trim() || envoiEnCours}
                            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {envoiEnCours ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {type == "galerieEtNouvelleImage" ? "Ajouter et insérer" : type == "remplacerImage" ? "Remplacer" : "Ajouter"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}