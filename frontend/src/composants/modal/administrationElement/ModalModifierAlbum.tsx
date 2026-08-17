import { useEffect, useState } from "react";
import Album from "../../blog/Album";
import Modal from "../Modal";
import { useRequete } from "../../../fonctions/requete";
import type { PhotoAlbum } from "../../../constantes/types/blog";
import { useNotifications } from "../../../contexts/NotificationsContext";

interface Props {
    ouvert: boolean;
    onFermer: () => void;
    url: string | null;
}

export default function ModalModiferAlbum({ ouvert, url, onFermer }: Props) {
    const [images, setImages] = useState<PhotoAlbum[] | null>(null);
    const [imagesInitiales, setImagesInitiales] = useState<PhotoAlbum[] | null>(null);

    const requete = useRequete();
    const { notifier } = useNotifications()


    useEffect(() => {
        async function recuperationDonnees() {
            if (!url) return;
            const reponse = await requete({ url: "/articles/recuperer-album?url=" + url });

            // Si l'API renvoie du JSON sous forme de chaîne (TEXT) ou déjà parsé
            const donneeParsee = typeof reponse.contenuHtml === "string"
                ? JSON.parse(reponse.contenuHtml)
                : reponse.contenuHtml;

            setImages(donneeParsee);
            setImagesInitiales(donneeParsee);
        }
        recuperationDonnees();
    }, [url]);

    // Vérifie si les données ont changé ou si les images ne sont pas encore chargées
    const estInchange = JSON.stringify(images) === JSON.stringify(imagesInitiales);

    return (
        <Modal ouvert={ouvert} titre={`Modifier l'album`} onFermer={onFermer}>
            <Album
                images={images}
                modeEdition={true}
                onPhotosChange={(nouvImages: PhotoAlbum[]) => setImages(nouvImages)}
            />
            <div className="text-center mt-3">
                <button
                    className="desactiver rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={estInchange}
                    onClick={async () => {
                        const reponse = await requete({ url: "/articles/modifier-album", methode: "POST", corps: { url, images } })
                        if (reponse.album) {
                            notifier({ type: "succes", titre: "Succès !", description: reponse.detail })
                            onFermer()
                        } else {
                            notifier({ type: "erreur", titre: "Erreur", description: reponse.detail })
                        }
                    }}
                >
                    Enregistrer
                </button>
            </div>
        </Modal>
    );
}