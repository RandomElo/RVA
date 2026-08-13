import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRequete } from "../../fonctions/requete";
import { Minus, Plus, X } from "lucide-react";

interface Props {
    chemin: string;
}

/**
 * Formate un chemin de fichier (ex: "newsletter-aout-2026.jpg")
 * en un titre lisible (ex: "Newsletter aout 2026")
 */
function formaterTitre(chemin: string): string {
    if (!chemin) return "Aperçu de la newsletter";

    // Extraire le nom du fichier (supprime d'éventuels dossiers)
    const nomFichier = chemin.split("/").pop() || chemin;

    // Supprimer l'extension de fichier (ex: .jpg, .png)
    const sansExtension = nomFichier.replace(/\.[^/.]+$/, "");

    // Remplacer les tirets et underscores par des espaces
    const avecEspaces = sansExtension.replace(/[-_]/g, " ");

    // Mettre la première lettre en majuscule
    return avecEspaces.charAt(0).toUpperCase() + avecEspaces.slice(1);
}

export default function RecupererNewsletter({ chemin }: Props) {
    const [image, setImage] = useState<string>("");
    const [titre, setTitre] = useState<string>("");
    const [chargement, setChargement] = useState<boolean>(false);
    const [erreur, setErreur] = useState<string>("");
    const [modalOuverte, setModalOuverte] = useState<boolean>(false);
    const requete = useRequete();

    useEffect(() => {
        let objectUrl: string | null = null;

        async function recuperation() {
            setChargement(true);
            setErreur("");

            // Mise en forme du titre basé sur le chemin
            setTitre(formaterTitre(chemin));

            const reponse = await requete({
                url: "/articles/recuperer-newsletter/" + chemin,
                blob: true,
            });

            if (!reponse) {
                setErreur("Newsletter introuvable.");
                setImage("");
                setChargement(false);
                return;
            }

            objectUrl = URL.createObjectURL(reponse);
            setImage(objectUrl);
            setChargement(false);
        }

        recuperation();

        // Nettoyage de l'URL Blob mémoire lors du démonte du composant
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [chemin]);

    if (chargement) {
        return (
            <div className="flex items-center justify-center bg-gray-100 rounded-lg h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#040F33]" />
            </div>
        );
    }

    if (erreur) {
        return (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-club-200 h-64 text-center px-4">
                <p className="text-sm text-[#0B2270]/60">{erreur}</p>
            </div>
        );
    }

    if (!image) return null;

    return (
        <>
            <div className="group relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
                {/* Image affichée */}
                <img
                    src={image}
                    alt={titre}
                    className="w-full object-contain max-h-[600px] bg-gray-50 transition-transform duration-300 group-hover:scale-[1.01]"
                />

                {/* Bandeau d'information / Overlay au survol */}
                <button
                    type="button"
                    onClick={() => setModalOuverte(true)}
                    aria-label={`Agrandir ${titre}`}
                    className="absolute inset-0 flex flex-col items-center justify-between p-4 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 cursor-zoom-in"
                >
                    <span className="self-end rounded-full bg-white m-auto px-5 py-3 text-xl font-semibold text-[#040F33] shadow">
                        Cliquer pour agrandir
                    </span>
                    <span className="w-full text-left font-medium text-white drop-shadow truncate">
                        {titre}
                    </span>
                </button>
            </div>

            {/* Modal pour zoomer sur l'image */}
            {modalOuverte && (
                <ModalZoomImage
                    src={image}
                    titre={titre}
                    onFermer={() => setModalOuverte(false)}
                />
            )}
        </>
    );
}

/* =========================================================================
   Composant Modal Zoom pour l'image
   ========================================================================= */

interface ModalZoomImageProps {
    src: string;
    titre: string;
    onFermer: () => void;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_PAS = 0.25;

function ModalZoomImage({ src, titre, onFermer }: ModalZoomImageProps) {
    const [echelle, setEchelle] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const enTrainDeGlisser = useRef(false);
    const dernierPoint = useRef({ x: 0, y: 0 });

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

    function zoomer(delta: number) {
        setEchelle((e) => {
            const nouvelle = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, e + delta));
            if (nouvelle === ZOOM_MIN) setPosition({ x: 0, y: 0 });
            return nouvelle;
        });
    }

    function surMolette(e: React.WheelEvent) {
        e.preventDefault();
        zoomer(e.deltaY < 0 ? ZOOM_PAS : -ZOOM_PAS);
    }

    function surPointerDown(e: React.PointerEvent) {
        if (echelle === ZOOM_MIN) return;
        enTrainDeGlisser.current = true;
        dernierPoint.current = { x: e.clientX, y: e.clientY };
    }

    function surPointerMove(e: React.PointerEvent) {
        if (!enTrainDeGlisser.current) return;
        const dx = e.clientX - dernierPoint.current.x;
        const dy = e.clientY - dernierPoint.current.y;
        dernierPoint.current = { x: e.clientX, y: e.clientY };
        setPosition((p) => ({ x: p.x + dx, y: p.y + dy }));
    }

    function surPointerUp() {
        enTrainDeGlisser.current = false;
    }

    // Support Pinch-to-zoom sur mobile
    const distanceDepart = useRef<number | null>(null);
    const echelleDepart = useRef(1);

    function distanceEntreTouches(touches: React.TouchList) {
        const [t1, t2] = [touches[0], touches[1]];
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    function surTouchStart(e: React.TouchEvent) {
        if (e.touches.length === 2) {
            distanceDepart.current = distanceEntreTouches(e.touches);
            echelleDepart.current = echelle;
        }
    }

    function surTouchMove(e: React.TouchEvent) {
        if (e.touches.length === 2 && distanceDepart.current) {
            const nouvelleDistance = distanceEntreTouches(e.touches);
            const ratio = nouvelleDistance / distanceDepart.current;
            const nouvelle = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, echelleDepart.current * ratio));
            setEchelle(nouvelle);
            if (nouvelle === ZOOM_MIN) setPosition({ x: 0, y: 0 });
        }
    }

    function surTouchEnd(e: React.TouchEvent) {
        if (e.touches.length < 2) distanceDepart.current = null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={titre}
        >
            {/* Barre de navigation haute */}
            <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
                <p className="truncate text-sm font-medium text-white sm:text-base">{titre}</p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => zoomer(-ZOOM_PAS)}
                        disabled={echelle <= ZOOM_MIN}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30"
                        aria-label="Dézoomer"
                    >
                        <Minus size={16} />
                    </button>
                    <span className="w-12 text-center text-xs text-white/80">
                        {Math.round(echelle * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => zoomer(ZOOM_PAS)}
                        disabled={echelle >= ZOOM_MAX}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30"
                        aria-label="Zoomer"
                    >
                        <Plus size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={onFermer}
                        className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                        aria-label="Fermer"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Zone d'affichage et de contrôle de l'image */}
            <div
                className="relative flex-1 touch-none overflow-hidden flex items-center justify-center p-4 sm:p-8"
                onWheel={surMolette}
                onPointerDown={surPointerDown}
                onPointerMove={surPointerMove}
                onPointerUp={surPointerUp}
                onPointerLeave={surPointerUp}
                onTouchStart={surTouchStart}
                onTouchMove={surTouchMove}
                onTouchEnd={surTouchEnd}
                onDoubleClick={() => (echelle === ZOOM_MIN ? zoomer(1) : (setEchelle(ZOOM_MIN), setPosition({ x: 0, y: 0 })))}
            >
                <div
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${echelle})`,
                        transformOrigin: "center center",
                        transition: enTrainDeGlisser.current ? "none" : "transform 0.15s ease-out",
                        cursor: echelle > ZOOM_MIN ? "grab" : "default",
                    }}
                    className="max-h-full max-w-full flex items-center justify-center"
                >
                    <img
                        src={src}
                        alt={titre}
                        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none"
                        draggable={false}
                    />
                </div>
            </div>

            <p className="p-2 text-center text-xs text-white/60 sm:hidden">
                Pincez pour zoomer · Double-tap pour réinitialiser
            </p>
        </div>,
        document.body
    );
}