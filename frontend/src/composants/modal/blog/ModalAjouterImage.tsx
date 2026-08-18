/**
 * Modale d'ajout d'image dans l'éditeur (TipTap).
 * Emplacement suggéré : src/composants/editeur/ModalAjouterImage.tsx
 *
 * Modes existants (via la bascule en haut de la modale) :
 *   1. "Galerie" : sélection d'une image déjà existante sur le site.
 *   2. "Nouvelle image" : upload d'un fichier via drag & drop, avec un
 *      texte alternatif obligatoire, inséré ensuite dans l'éditeur.
 *   3. "remplacerImage" : remplace le fichier d'une image existante.
 *
 * Type ajouté pour les albums :
 *   4. "nouvellePhotoAlbum" : contrairement aux autres types "ajouter",
 *      celui-ci affiche AUSSI la bascule Galerie / Nouvelle image (comme
 *      "galerieEtNouvelleImage"), et permet une sélection MULTIPLE dans
 *      les deux modes :
 *        - Galerie : on peut cocher plusieurs images déjà existantes sur
 *          le site (leur `alt` sert de légende).
 *        - Nouvelle image : on peut déposer/choisir plusieurs fichiers
 *          d'un coup, chacun avec sa propre légende à renseigner avant
 *          l'envoi.
 *      Dans les deux cas, la modale appelle une seule fois
 *      `onPhotosAjoutees(photos)` avec le tableau complet des photos
 *      ajoutées (plutôt que d'appeler un callback plusieurs fois de
 *      suite, ce qui perdrait des éléments à cause du batching React
 *      côté parent). Ce mode n'insère rien dans un éditeur TipTap :
 *      `editor`, `images` et `setImages` restent donc optionnels.
 *
 *   ⚠️ Les autres types ("galerieEtNouvelleImage", "nouvelleImage",
 *   "remplacerImage") gardent EXACTEMENT leur comportement d'origine
 *   (sélection unique, un seul fichier) : toute la logique multi-photo
 *   ci-dessous ne s'active que si `estAlbum` est vrai.
 *
 * Prérequis / hypothèses à ajuster si besoin :
 * 1. Adapter les chemins d'import de `Modal`, `useRequete` et `Editor`.
 * 2. Le modèle back-end des images de galerie expose au minimum
 *    { id, alt, nomFichier } (voir migration Sequelize fournie). Aucun
 *    champ `url` n'est garanti : l'URL affichée est donc reconstruite
 *    via CHEMIN_UPLOADS + nomFichier.
 * 3. Endpoint galerie : POST /image/ajouter
 *    (multipart/form-data, champs "image" et "alt") → renvoie
 *      { donnees: ImageSite[], notification }
 * 4. Endpoint album (NOUVEAU, à créer côté back si besoin) :
 *    POST /albums/ajouter-photo
 *    (multipart/form-data, champs "image", "legende" et "idAlbum") → renvoie
 *      { photo: { chemin: string; legende: string }, notification: { titre, description } }
 *    Appelé une fois PAR fichier envoyé (en parallèle via Promise.all).
 * 5. Sélection dans la galerie pour un album : aucune requête n'est faite
 *    (on réutilise directement l'image déjà sur le site, avec son `alt`
 *    comme légende). Si l'association doit être persistée côté back
 *    (ex. table de liaison album/image), il faudra ajouter un appel
 *    réseau dans `confirmerGalerie` (branche `estAlbum`) — non fait ici
 *    faute de savoir comment ce lien doit être stocké.
 */

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, UploadCloud, Loader2, Upload, Check, TriangleAlert, X } from "lucide-react";
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
    /** Inutile (et non fourni) en mode "nouvellePhotoAlbum". */
    editor?: Editor;
    images?: ImageSite[];
    setImages?: React.Dispatch<React.SetStateAction<ImageSite[]>>;
    type: "galerieEtNouvelleImage" | "nouvelleImage" | "remplacerImage" | "nouvellePhotoAlbum";
    ancienneDonnees?: ImageSite;
    /** Appelé UNE FOIS avec toutes les photos ajoutées, uniquement pour type="nouvellePhotoAlbum". */
    onPhotosAjoutees?: (photos: { chemin: string; legende: string }[]) => void;
    onImageSelectionnee?: (url: string, alt: string) => void;
}

type Mode = "galerie" | "ajouter";

type ReponseAjoutImage = {
    donnees: ImageSite[];
    notification: {
        titre: string;
        description: string;
    }
};

interface FichierAlbum {
    id: string;
    file: File;
    apercu: string;
    legende: string;
}

const EXTENSIONS_ACCEPTEES = [".jpg", ".jpeg", ".png", ".webp"];

function getUrlImage(image: ImageSite): string {
    return `${CHEMIN_UPLOADS}/${image.nomFichier}`;
}

function extensionValide(nomFichier: string): boolean {
    return EXTENSIONS_ACCEPTEES.some((ext) => nomFichier.toLowerCase().endsWith(ext));
}

export default function ModalAjouterImage({ ouvert, onFermer, editor, images = [], setImages, type, ancienneDonnees, onPhotosAjoutees, onImageSelectionnee }: Props) {
    const [mode, setMode] = useState<Mode>();

    const estAlbum = type === "nouvellePhotoAlbum";
    // La bascule Galerie / Nouvelle image s'affiche pour "galerieEtNouvelleImage" ET pour les albums.
    const afficherBascule = type === "galerieEtNouvelleImage" || estAlbum;

    // --- Mode galerie (sélection unique pour les autres types, multiple pour un album) ---
    const [imagesSelectionnees, setImagesSelectionnees] = useState<ImageSite[]>([]);

    // --- Mode upload : un seul fichier (comportement d'origine, types non-album) ---
    const [fichier, setFichier] = useState<File | null>(null);
    const [apercu, setApercu] = useState<string | null>(null);
    const [alt, setAlt] = useState<string>("");

    // --- Mode upload : plusieurs fichiers (album uniquement) ---
    const [fichiersAlbum, setFichiersAlbum] = useState<FichierAlbum[]>([]);

    const [erreur, setErreur] = useState<string | null>(null);
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [survole, setSurvole] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const requete = useRequete();
    const { notifier } = useNotifications()

    const labelChamp = estAlbum ? "Légende" : "Texte alternatif";
    const placeholderChamp = estAlbum ? "Décrivez ce que montre la photo" : "Décrivez brièvement l'image";

    useEffect(() => {
        function calculMode() {
            if (type == "nouvelleImage" || type == "remplacerImage" || type == "nouvellePhotoAlbum") {
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
        setImagesSelectionnees([]);
        setFichier(null);
        setApercu(null);
        setAlt("");
        fichiersAlbum.forEach((f) => URL.revokeObjectURL(f.apercu));
        setFichiersAlbum([]);
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
        if (onImageSelectionnee) {
            onImageSelectionnee(src, texteAlt);
        } else {
            editor?.chain().focus().setImage({ src, alt: texteAlt }).run();
        }
        fermer();
    }

    // --- Sélection dans la galerie ---
    function cliquerImageGalerie(image: ImageSite) {
        if (estAlbum) {
            // Sélection multiple : on coche / décoche
            setImagesSelectionnees((prev) => {
                const dejaSelectionnee = prev.some((img) => img.nomFichier === image.nomFichier);
                return dejaSelectionnee ? prev.filter((img) => img.nomFichier !== image.nomFichier) : [...prev, image];
            });
        } else {
            // Comportement d'origine : sélection unique
            setImagesSelectionnees([image]);
        }
    }

    function confirmerGalerie() {
        if (imagesSelectionnees.length === 0) return;

        if (estAlbum) {
            const photos = imagesSelectionnees.map((image) => ({ chemin: image.nomFichier, legende: image.alt }));
            onPhotosAjoutees?.(photos);
            fermer();
            return;
        }

        // Comportement d'origine : insertion unique dans l'éditeur
        inserer(getUrlImage(imagesSelectionnees[0]), imagesSelectionnees[0].alt);
    }

    // --- Upload : un seul fichier (types non-album, inchangé) ---
    function choisirFichier(f: File | null) {
        setErreur(null);
        if (!f) {
            setFichier(null);
            setApercu(null);
            return;
        }
        if (!extensionValide(f.name)) {
            setErreur("Formats acceptés : .jpg, .jpeg, .png, .webp.");
            return;
        }
        setFichier(f);
        setApercu(URL.createObjectURL(f));
    }

    // --- Upload : plusieurs fichiers (album uniquement) ---
    function choisirFichiersAlbum(liste: FileList | File[] | null) {
        setErreur(null);
        if (!liste) return;
        const nouveaux: FichierAlbum[] = [];
        let uneExtensionInvalide = false;
        for (const f of Array.from(liste)) {
            if (!extensionValide(f.name)) {
                uneExtensionInvalide = true;
                continue;
            }
            nouveaux.push({ id: `${f.name}-${f.size}-${f.lastModified}`, file: f, apercu: URL.createObjectURL(f), legende: "" });
        }
        if (uneExtensionInvalide) {
            setErreur("Certains fichiers ont été ignorés (formats acceptés : .jpg, .jpeg, .png, .webp).");
        }
        if (nouveaux.length > 0) {
            setFichiersAlbum((prev) => [...prev, ...nouveaux]);
        }
    }

    function retirerFichierAlbum(id: string) {
        setFichiersAlbum((prev) => {
            const cible = prev.find((f) => f.id === id);
            if (cible) URL.revokeObjectURL(cible.apercu);
            return prev.filter((f) => f.id !== id);
        });
    }

    function changerLegendeFichier(id: string, legende: string) {
        setFichiersAlbum((prev) => prev.map((f) => (f.id === id ? { ...f, legende } : f)));
    }

    function onDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setSurvole(false);
        if (estAlbum) {
            choisirFichiersAlbum(e.dataTransfer.files);
        } else {
            choisirFichier(e.dataTransfer.files?.[0] ?? null);
        }
    }

    async function envoyerImage() {
        // --- Cas 1 : ajout de plusieurs photos à un album ---
        if (estAlbum) {
            if (fichiersAlbum.length === 0) return;
            if (fichiersAlbum.some((f) => !f.legende.trim())) {
                setErreur("Merci de renseigner un texte alternatif pour chaque photo.");
                return;
            }

            setEnvoiEnCours(true);
            setErreur(null);
            try {
                const urlDestination = "/images/ajouter?mode=" + (type === "galerieEtNouvelleImage" ? "galerie" : "tout");

                const resultats = await Promise.all(
                    fichiersAlbum.map(async (f) => {
                        const formData = new FormData();
                        formData.append("image", f.file);
                        formData.append("alt", f.legende.trim()); // Utilise le champ alt attendu par la route /images

                        const reponse: ReponseAjoutImage = await requete({
                            url: urlDestination,
                            methode: "POST",
                            corps: formData,
                            formData: true
                        });
                        return reponse;
                    })
                );

                // Notification basée sur le dernier résultat reçu
                const derniereReponse = resultats[resultats.length - 1];
                if (derniereReponse) {
                    notifier({
                        type: "succes",
                        titre: derniereReponse.notification.titre,
                        description: derniereReponse.notification.description
                    });

                    // Met à jour le tableau d'images global si la réponse contient la liste mise à jour
                    setImages?.(derniereReponse.donnees);
                }

                // Récupère toutes les nouvelles images créées pour le callback du composant parent
                const nouvellesPhotos = resultats.map((r) => r.donnees[r.donnees.length - 1]).filter(Boolean);
                onPhotosAjoutees?.(
                    nouvellesPhotos.map((i) => ({
                        chemin: i.nomFichier,
                        legende: i.alt
                    }))
                );

                fermer();
            } catch (e) {
                console.error(e);
                setErreur("Impossible d'importer une ou plusieurs photos. Vérifiez les fichiers et réessayez.");
            } finally {
                setEnvoiEnCours(false);
            }
            return;
        }

        // --- Cas 2 : ajout / remplacement d'une image de la galerie (inchangé) ---
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

            setImages?.(reponse.donnees);

            notifier({ type: "succes", titre: reponse.notification.titre, description: reponse.notification.description });

            // La nouvelle image est censée être la dernière de la liste renvoyée.
            const nouvelleImage = reponse.donnees[reponse.donnees.length - 1];

            if (type == "remplacerImage") {
                setImages?.(reponse.donnees);
                window.location.reload();
                fermer();
            } else if (nouvelleImage) {
                inserer(getUrlImage(nouvelleImage), nouvelleImage.alt);
            } else {
                fermer();
            }
        } catch (e) {
            console.error(e);
            setErreur("Impossible d'importer l'image. Vérifiez le fichier et réessayez.");
        } finally {
            setEnvoiEnCours(false);
        }
    }
    const titreModal = type == "remplacerImage" ? "Remplacer l'image" : estAlbum ? "Ajouter des photos à l'album" : "Ajouter une image";
    const texteBoutonGalerie = estAlbum && imagesSelectionnees.length > 1 ? `Ajouter ${imagesSelectionnees.length} photos` : estAlbum ? "Ajouter à l'album" : "Insérer l'image";
    const texteBoutonUpload =
        type == "galerieEtNouvelleImage"
            ? "Ajouter et insérer"
            : type == "remplacerImage"
                ? "Remplacer"
                : estAlbum
                    ? fichiersAlbum.length > 1
                        ? `Ajouter ${fichiersAlbum.length} photos`
                        : "Ajouter à l'album"
                    : "Ajouter";

    return (
        <Modal ouvert={ouvert} titre={titreModal} onFermer={fermer} largeurMax="md">
            {afficherBascule &&
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
                        <div className="grid max-h-80 grid-cols-3 gap-x-3 gap-y-34 overflow-y-auto pr-1">
                            {images.map((image, key) => {
                                const active = imagesSelectionnees.some((img) => img.nomFichier === image.nomFichier);
                                return (
                                    <button
                                        type="button"
                                        key={key}
                                        onClick={() => cliquerImageGalerie(image)}
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

                    {estAlbum && imagesSelectionnees.length > 0 && (
                        <p className="text-sm text-club-600">
                            {imagesSelectionnees.length} image{imagesSelectionnees.length > 1 ? "s" : ""} sélectionnée{imagesSelectionnees.length > 1 ? "s" : ""}
                        </p>
                    )}

                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={fermer} className="rounded-lg px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={confirmerGalerie}
                            disabled={imagesSelectionnees.length === 0}
                            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {texteBoutonGalerie}
                        </button>
                    </div>
                </div>
            ) : estAlbum ? (
                /* --- Upload multiple, album uniquement --- */
                <div className="flex flex-col gap-4">
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept={EXTENSIONS_ACCEPTEES.join(",")}
                        className="hidden"
                        onChange={(e) => {
                            choisirFichiersAlbum(e.target.files);
                            e.target.value = "";
                        }}
                    />

                    <div
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => setSurvole(true)}
                        onDragLeave={() => setSurvole(false)}
                        onDrop={onDrop}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed py-6 text-center transition ${survole ? "border-club-500 bg-club-100" : "border-club-200 bg-club-50 hover:border-club-400"}`}
                    >
                        <UploadCloud size={26} className="text-club-300" />
                        <span className="text-sm font-medium text-club-600">Cliquer ou glisser une ou plusieurs images ici</span>
                        <span className="text-xs text-club-900/50">.jpg, .jpeg, .png ou .webp</span>
                    </div>

                    {fichiersAlbum.length > 0 && (
                        <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                            {fichiersAlbum.map((f) => (
                                <div key={f.id} className="flex items-center gap-3 rounded-lg border border-club-100 p-2">
                                    <img src={f.apercu} alt="Aperçu" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                                    <input
                                        type="text"
                                        value={f.legende}
                                        autoComplete="off"
                                        onChange={(e) => changerLegendeFichier(f.id, e.target.value)}
                                        placeholder={placeholderChamp}
                                        className="inputStyle w-full rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => retirerFichierAlbum(f.id)}
                                        className="shrink-0 cursor-pointer rounded-full p-1.5 text-club-400 transition hover:bg-club-50 hover:text-red-600"
                                        aria-label="Retirer cette photo"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
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
                            disabled={fichiersAlbum.length === 0 || fichiersAlbum.some((f) => !f.legende.trim()) || envoiEnCours}
                            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {envoiEnCours ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {texteBoutonUpload}
                        </button>
                    </div>
                </div>
            ) : (
                /* --- Upload d'un seul fichier (types non-album, comportement d'origine inchangé) --- */
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
                            {labelChamp}
                        </label>
                        <input
                            id="alt"
                            type="text"
                            value={alt}
                            autoComplete="off"
                            disabled={type == "remplacerImage"}
                            onChange={(e) => setAlt(e.target.value)}
                            placeholder={placeholderChamp}
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
                            {texteBoutonUpload}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}