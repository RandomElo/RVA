/**
 * Images du formulaire de rédaction : galerie du site (chargée une fois) et ouverture des modales
 * d'insertion dans l'éditeur et de choix de l'image de couverture.
 */

import { useEffect, useEffectEvent, useState } from "react";
import { useRequete } from "../requete";
import type { ImageSite } from "../../constantes/types/blog";

export function useImagesArticle() {
    const [images, setImages] = useState<ImageSite[]>([]);
    const [modalImageOuverte, setModalImageOuverte] = useState<boolean>(false);
    const [modalCouvertureOuverte, setModalCouvertureOuverte] = useState<boolean>(false);
    const requete = useRequete();

    const recupererGalerie = useEffectEvent(() => requete<ImageSite[]>({ url: "/images/recuperer-galerie" }));

    useEffect(() => {
        recupererGalerie().then((reponse) => {
            if (!reponse) return;
            setImages(reponse);
        });
    }, []);

    return { images, setImages, modalImageOuverte, setModalImageOuverte, modalCouvertureOuverte, setModalCouvertureOuverte };
}

export type ImagesArticle = ReturnType<typeof useImagesArticle>;
