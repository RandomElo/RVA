import { useEffect, useState } from "react";
import type { ImageSite } from "../../../constantes/types/blog";
import Modal from "../Modal";
import { Edit } from "lucide-react";
import { useRequete } from "../../../fonctions/requete";
import { useNotifications } from "../../../contexts/NotificationsContext";

interface Props {
    image: ImageSite | null,
    setImages: React.Dispatch<React.SetStateAction<ImageSite[] | null>>,
    onFermer: () => void
}

export default function ModalModifierAlt({ image, setImages, onFermer }: Props) {
    const [alt, setAlt] = useState<string>("")

    const requete = useRequete()
    const { notifier } = useNotifications()

    useEffect(() => {
        function definirAlt() {
            if (!image) return
            setAlt(image.alt)
        }
        definirAlt()
    }, [image]);

    return <Modal ouvert={Boolean(image)}
        titre="Modifier le texte alternatif"
        onFermer={onFermer}>
        <form onSubmit={async (e) => {
            e.preventDefault()
            if (!image) return;

            const reponse = await requete({ url: "/images/modifier-alt", methode: "POST", corps: { nomFichier: image.nomFichier, alt } })

            setImages(reponse)
            notifier({ type: "succes", titre: "Succès !", description: "Texte alternatif modifié avec succès !" })

            onFermer()
        }}>

            <div className="flex flex-col gap-1 mb-3">
                <label htmlFor="textAlternatif" className="text-sm font-medium text-club-700">
                    Text alternatif
                </label>
                <input id="textAlternatif" type="text" value={alt} required autoComplete="off" onChange={(e) => setAlt(e.target.value)} placeholder="Camille" className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200" />
            </div>

            <button className="desactiver ml-auto flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Edit size={16} />
                Modifier</button>
        </form>
    </Modal>
}