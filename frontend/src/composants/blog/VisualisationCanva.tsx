import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRequete } from "../../fonctions/requete";
import type { ArticleFormValue } from "../../constantes/types/blog";
import { X } from "lucide-react";

interface DonneesOembed {
    html: string;
    thumbnail_url?: string;
    title?: string;
    width?: number;
    height?: number;
}

interface Props {
    url: string;
    setErreurs?: React.Dispatch<React.SetStateAction<Partial<Record<keyof ArticleFormValue, string>>>>;
}

// Hauteur approximative (en px) du footer Canva à "couper" en bas de l'iframe
const HAUTEUR_FOOTER_CANVA = 40;

export default function VisualisationCanva({ url, setErreurs }: Props) {
    const [donnees, setDonnees] = useState<DonneesOembed | null>(null);
    const [enChargement, setEnChargement] = useState(true);
    const [modalOuverte, setModalOuverte] = useState(false);
    const requete = useRequete();

    useEffect(() => {
        async function recuperationCanva() {
            setEnChargement(true);
            const reponse = await requete({ url: `/articles/apercu-canva?url=${encodeURIComponent(url)}` });
            if (!reponse.recuperer) {
                setErreurs!((err) => ({
                    ...err,
                    urlCanva: reponse.detail,
                }));
            } else {
                setErreurs!((err) => ({
                    ...err,
                    urlCanva: undefined,
                }));
                setDonnees(reponse.detail);
            }
            setEnChargement(false);
        }
        recuperationCanva();
    }, [url]);

    if (enChargement) return (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#040F33]" />
        </div>
    );
    if (!donnees) return null;

    const correspondance = donnees.html.match(/src="([^"]+)"/);
    const src = correspondance?.[1];
    if (!src) return null;

    return (
        <>
            <div
                className="group relative w-full overflow-hidden rounded-lg"
                style={{ paddingBottom: "56.25%" }}
            >
                {/* Zone cachée qui déborde vers le bas pour masquer le footer Canva */}
                <div className="absolute inset-0 overflow-hidden">
                    <iframe
                        src={src}
                        title={donnees.title ?? "Aperçu Canva"}
                        allow="fullscreen"
                        allowFullScreen
                        className="absolute inset-x-0 top-0 w-full border-0"
                        style={{ height: `calc(100% + ${HAUTEUR_FOOTER_CANVA}px)` }}
                    />
                </div>
            </div>

            {modalOuverte && (
                <ModalCanva
                    src={src}
                    titre={donnees.title ?? "Aperçu Canva"}
                    onFermer={() => setModalOuverte(false)}
                />
            )}
        </>
    );
}

interface ModalCanvaProps {
    src: string;
    titre: string;
    onFermer: () => void;
}

function ModalCanva({ src, titre, onFermer }: ModalCanvaProps) {
    // Fermer avec Échap, bloquer le scroll de la page derrière
    useEffect(() => {
        const surTouche = (e: KeyboardEvent) => {
            if (e.key === "Escape") onFermer();
        };
        document.addEventListener("keydown", surTouche);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", surTouche);
            document.body.style.overflow = "";
        };
    }, [onFermer]);

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={titre}
        >
            {/* Barre du haut */}
            <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
                <p className="truncate text-sm font-medium text-white sm:text-base">{titre}</p>
                <button
                    type="button"
                    onClick={onFermer}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                    aria-label="Fermer"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Zone d'affichage */}
            <div className="relative flex-1 overflow-hidden">
                <div className="absolute inset-4 overflow-hidden rounded-lg shadow-2xl sm:inset-8">
                    <iframe
                        src={src}
                        title={titre}
                        allow="fullscreen"
                        allowFullScreen
                        className="absolute inset-x-0 top-0 h-[calc(100%+40px)] w-full border-0 bg-white"
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}