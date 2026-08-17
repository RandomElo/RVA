import { Link } from "react-router-dom";
import { AlertTriangle, ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";
import Modal from "../Modal"; // Adapter le chemin selon votre structure
import type { ImageSite } from "../../../constantes/types/blog";
import { useState } from "react";
import { useRequete } from "../../../fonctions/requete";
import { useNotifications } from "../../../contexts/NotificationsContext";

// Types (À adapter selon votre projet s'ils sont exportés d'ailleurs)
type DetailUtilisation = {
    titre: string;
    url: string;
};

type ImageUtilisation = {
    nomFichier: string;
    detail: DetailUtilisation[];
};

type Props = {
    imageASupprimer: ImageSite | null;
    setImageASupprimer: (image: ImageSite | null) => void;
    setImages: (value: ImageSite[]) => void;
    detailsUtilisationImages: ImageUtilisation[];
};

export default function ModalSupprimerImage({ imageASupprimer, setImageASupprimer, detailsUtilisationImages, setImages }: Props) {
    const [suppressionEnCours, setSuppressionEnCours] = useState<boolean>(false)

    const requete = useRequete()
    const { notifier } = useNotifications()

    // Récupération des articles liés à l'image
    const detailsImage = detailsUtilisationImages.find((img) => img.nomFichier === imageASupprimer?.nomFichier);
    const articlesLies = detailsImage?.detail || [];

    async function confirmerSuppression() {
        if (!imageASupprimer) {
            return notifier({ type: "erreur", titre: "Erreur", description: "Aucune image à supprimer." })
        }
        setSuppressionEnCours(true)

        const reponse = await requete({ url: "/images/supprimer-image-galerie", methode: "DELETE", corps: { image: imageASupprimer.nomFichier } })
        setImages(reponse.donnees)

        notifier({ type: "succes", titre: "Succès !", description: reponse.notification })
        setImageASupprimer(null)

    }

    if (!imageASupprimer) return null;

    return (
        <Modal
            ouvert={Boolean(imageASupprimer)}
            titre="Supprimer l'image ?"
            onFermer={() => setImageASupprimer(null)}
        >
            <div className="space-y-5">
                {/* Avertissement principal */}
                <p className="text-sm text-club-700 leading-relaxed">
                    Êtes-vous sûr de vouloir supprimer définitivement l'image{" "}
                    <span className="font-semibold text-club-900 bg-club-100 px-2 py-0.5 rounded break-all">
                        {imageASupprimer.nomFichier}
                    </span>{" "}
                    ? Cette action est <strong className="text-red-600 font-semibold">irréversible</strong>.
                </p>

                {/* Section d'impact / Liste des articles rattachés */}
                {articlesLies.length > 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold uppercase tracking-wider">
                            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                            <span>
                                Attention : Cette image est utilisée dans {articlesLies.length}{" "}
                                {articlesLies.length > 1 ? "articles" : "article"}
                            </span>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                            {articlesLies.map((detail, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-white p-2.5 shadow-2xs transition hover:border-amber-300"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText size={16} className="shrink-0 text-club-500" />
                                        <span className="text-xs font-medium text-club-900 truncate">
                                            {detail.titre}
                                        </span>
                                    </div>

                                    <Link
                                        to={`/article/${detail.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-700 transition hover:bg-accent-500 hover:text-white"
                                    >
                                        <span>Voir</span>
                                        <ExternalLink size={12} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-club-100 bg-club-50/50 p-3 text-xs text-club-600">
                        Cette image ne semble être utilisée dans aucun article.
                    </div>
                )}

                {/* Actions (Boutons d'action) */}
                <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => setImageASupprimer(null)}
                        disabled={suppressionEnCours}
                        className="rounded-lg px-4 py-2.5 text-sm font-medium text-club-700 transition hover:bg-club-100/60 disabled:opacity-50 cursor-pointer"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={confirmerSuppression}
                        disabled={suppressionEnCours}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                        {suppressionEnCours ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                        <span>Supprimer définitivement</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
}