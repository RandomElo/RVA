/**
 * Affichage d'un album photo (grille + lightbox).
 * Emplacement suggéré : src/composants/blog/Album.tsx
 *
 * Composant purement contrôlé : il reçoit ses photos en props et ne
 * possède pas son propre état de données (comme demandé). En mode
 * édition, il propose une tuile "+" qui ouvre ModalAjouterImage
 * (type="nouvellePhotoAlbum") et remonte la nouvelle photo au parent
 * via `onPhotosChange`, qui reste responsable de mettre à jour `images`.
 *
 * `images` accepte `null` (ex: pendant un chargement) : on retombe sur
 * un tableau vide via `photos = images ?? []`, utilisé partout dans le
 * composant à la place de `images` pour éviter les soucis TypeScript.
 */

const CHEMIN_UPLOADS = "/images/i";

function getUrlImage(image: PhotoAlbum): string {
    return `${CHEMIN_UPLOADS}/${image.chemin}`;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Plus, Trash2, X } from "lucide-react";
import ModalAjouterImage from "../modal/blog/ModalAjouterImage";
import type { ImageSite, PhotoAlbum } from "../../constantes/types/blog";


interface AlbumProps {
    images: PhotoAlbum[] | null;
    imagesGalerie?: ImageSite[];

    /** Préfixe à ajouter devant `chemin` pour reconstruire l'URL. Laisser vide si `chemin` est déjà une URL complète. */
    cheminBase?: string;
    /** Active la tuile "+" permettant d'ajouter une photo à l'album. */
    modeEdition?: boolean;
    /** Appelé avec la liste mise à jour quand une photo est ajoutée (mode édition uniquement). */
    onPhotosChange?: (images: PhotoAlbum[]) => void;
}

export default function Album({ images, modeEdition = false, onPhotosChange, imagesGalerie }: AlbumProps) {
    const photos = images ?? [];

    const [indexOuvert, setIndexOuvert] = useState<number | null>(null);
    const [modalAjoutOuverte, setModalAjoutOuverte] = useState(false);

    const fermerLightbox = useCallback(() => setIndexOuvert(null), []);
    const photoPrecedente = useCallback(() => setIndexOuvert((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)), [photos.length]);
    const photoSuivante = useCallback(() => setIndexOuvert((i) => (i === null ? null : (i + 1) % photos.length)), [photos.length]);

    // Navigation clavier dans la lightbox
    useEffect(() => {
        if (indexOuvert === null) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") fermerLightbox();
            if (e.key === "ArrowLeft") photoPrecedente();
            if (e.key === "ArrowRight") photoSuivante();
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [indexOuvert, fermerLightbox, photoPrecedente, photoSuivante]);

    function ajouterPhotos(nouvellesPhotos: PhotoAlbum[]) {
        // Filtrer les nouvelles photos pour ne garder que celles qui n'existent pas encore
        const photosUniques = nouvellesPhotos.filter(
            (nouvelle) => !photos.some((existante) => existante.chemin === nouvelle.chemin)
        );

        // S'il y a de nouvelles photos valides, on met à jour la liste
        if (photosUniques.length > 0) {
            onPhotosChange?.([...photos, ...photosUniques]);
        }
    }

    function supprimerPhoto(index: number) {
        onPhotosChange?.(photos.filter((_, i) => i !== index));
    }

    // Swipe tactile dans le diaporama (mobile)
    const touchDepart = useRef<number | null>(null);
    function onTouchStart(e: React.TouchEvent) {
        touchDepart.current = e.touches[0].clientX;
    }
    function onTouchEnd(e: React.TouchEvent) {
        if (touchDepart.current === null) return;
        const delta = e.changedTouches[0].clientX - touchDepart.current;
        const SEUIL = 50;
        if (delta > SEUIL) photoPrecedente();
        else if (delta < -SEUIL) photoSuivante();
        touchDepart.current = null;
    }

    return (
        <section>
            {!modeEdition && (
                <button
                    type="button"
                    onClick={() => setIndexOuvert(0)}
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-accent-500 underline-offset-2 hover:underline"
                >
                    Cliquer pour consulter l'album en détail
                </button>
            )}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-club-400">
                    {photos.length} photo{photos.length > 1 ? "s" : ""}
                </span>
            </div>

            {photos.length === 0 && !modeEdition ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-club-200 bg-club-50 py-14 text-club-400">
                    <ImageOff size={28} />
                    <p className="text-sm">Aucune photo dans cet album pour le moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {photos.map((photo, i) => (
                        <div
                            key={`${photo.chemin}-${i}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setIndexOuvert(i)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setIndexOuvert(i);
                            }}
                            className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-club-100 bg-club-50 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-club-300/30"
                        >
                            <img
                                src={getUrlImage(photo)}
                                alt={photo.legende}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                            />
                            {photo.legende && (
                                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 p-2 text-center text-xs font-medium text-white opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                                    {photo.legende}
                                </span>
                            )}
                            {modeEdition && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        supprimerPhoto(i);
                                    }}
                                    className="absolute right-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-red-500 opacity-0 shadow-md backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:scale-110 hover:bg-red-500 hover:text-white"
                                    aria-label="Supprimer cette photo"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}

                    {modeEdition && (
                        <button
                            type="button"
                            onClick={() => setModalAjoutOuverte(true)}
                            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-club-200 text-club-400 transition-all duration-300 hover:border-accent-500 hover:text-accent-500"
                        >
                            <Plus size={26} />
                            <span className="text-xs font-medium">Ajouter une photo</span>
                        </button>
                    )}
                </div>
            )}

            {/* Diaporama plein écran */}
            {indexOuvert !== null && photos[indexOuvert] && (
                <div
                    className="fixed inset-0 z-50 flex select-none flex-col bg-black/97"
                    onClick={fermerLightbox}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Bouton fermer */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            fermerLightbox();
                        }}
                        className="absolute right-4 top-4 z-10 cursor-pointer rounded-full bg-white/10 p-2 text-white/90 transition hover:bg-white/20 hover:text-white sm:right-6 sm:top-6"
                        aria-label="Fermer"
                    >
                        <X size={28} />
                    </button>

                    {/* Compteur */}
                    <span className="absolute right-4 bottom-5 z-10 text-sm text-white sm:left-6 sm:top-7">
                        {indexOuvert + 1} / {photos.length} photos
                    </span>

                    {/* Flèches, plaquées sur les côtés de l'écran */}
                    {photos.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    photoPrecedente();
                                }}
                                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 hover:scale-110 sm:left-6 sm:p-4"
                                aria-label="Photo précédente"
                            >
                                <ChevronLeft size={28} className="sm:size-9" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    photoSuivante();
                                }}
                                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 hover:scale-110 sm:right-6 sm:p-4"
                                aria-label="Photo suivante"
                            >
                                <ChevronRight size={28} className="sm:size-9" />
                            </button>
                        </>
                    )}

                    {/* Zone photo : occupe l'espace restant, taille max explicite pour que les portraits tiennent aussi bien que les paysages */}
                    <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-16 pb-4 sm:px-20">
                        <img
                            key={indexOuvert}
                            src={getUrlImage(photos[indexOuvert])}
                            alt={photos[indexOuvert].legende}
                            onClick={(e) => e.stopPropagation()}
                            className="max-h-[70vh] max-w-[90vw] animate-[diapoEntree_350ms_ease-out] rounded-lg object-contain shadow-2xl sm:max-h-[75vh] sm:max-w-[85vw]"
                        />
                    </div>

                    {/* Pied de page : légende puis vignettes de l'album, toujours entièrement visible (ne rétrécit jamais la photo en dessous) */}
                    <div className="shrink-0 bg-gradient-to-t from-black/90 to-black/40 pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
                        {photos[indexOuvert].legende && (
                            <p key={`legende-${indexOuvert}`} className="animate-[diapoEntree_350ms_ease-out] px-6 pb-3 text-center text-sm font-medium text-white sm:text-base">
                                {photos[indexOuvert].legende}
                            </p>
                        )}

                        {photos.length > 1 && (
                            <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-1">
                                {photos.map((photo, i) => (
                                    <button
                                        type="button"
                                        key={`vignette-${photo.chemin}-${i}`}
                                        onClick={() => setIndexOuvert(i)}
                                        className={`h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition sm:h-16 sm:w-16 ${i === indexOuvert ? "border-accent-300 opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                                            }`}
                                        aria-label={`Voir la photo ${i + 1}`}
                                    >
                                        <img src={getUrlImage(photo)} alt={photo.legende} className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {modeEdition && (
                <ModalAjouterImage
                    ouvert={modalAjoutOuverte}
                    onFermer={() => setModalAjoutOuverte(false)}
                    type="nouvellePhotoAlbum"
                    // type="galerieEtNouvelleImage"
                    onPhotosAjoutees={ajouterPhotos}
                    images={imagesGalerie}
                />
            )}
        </section>
    );
}