/**
 * Champ propre à un album photo : la grille de photos remplace l'éditeur de contenu.
 */

import Album from "../../../composants/blog/Album";
import type { ImageSite, PhotoAlbum } from "../../../constantes/types/blog";

type Props = {
    photosAlbum: PhotoAlbum[] | null;
    setPhotosAlbum: (photos: PhotoAlbum[]) => void;
    /** Galerie du site, pour ajouter des photos déjà en ligne. */
    imagesGalerie: ImageSite[];
};

export default function FormulaireAlbum({ photosAlbum, setPhotosAlbum, imagesGalerie }: Props) {
    return (
        <>
            <p className="mb-1.5 block text-sm font-medium text-[#040F33]">Album photo</p>
            <Album images={photosAlbum} onPhotosChange={(images: PhotoAlbum[]) => setPhotosAlbum(images)} modeEdition={true} imagesGalerie={imagesGalerie} />
        </>
    );
}
