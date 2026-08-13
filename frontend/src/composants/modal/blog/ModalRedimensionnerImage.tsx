/**
 * Modale de redimensionnement d'une image insérée dans l'éditeur.
 * S'ouvre au clic sur une image (voir hook useClicImageEditeur ci-joint),
 * propose des tailles prédéfinies + un curseur pour un réglage fin,
 * puis applique la largeur via editor.chain().setNodeSelection(pos)
 * .updateAttributes('image', { width }).run().
 *
 * Prérequis : l'extension Image doit être remplacée par
 * ImageRedimensionnable (voir extensionImageRedimensionnable.ts),
 * qui gère l'attribut `width`.
 */

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import Modal from "../Modal";

const TAILLES_PREDEFINIES = [
    { label: "25%", valeur: "25%" },
    { label: "50%", valeur: "50%" },
    { label: "75%", valeur: "75%" },
    { label: "100%", valeur: "100%" }
];

interface Props {
    editor: Editor;
    ouvert: boolean;
    onFermer: () => void;
    pos: number | null;
    largeurActuelle: string;
}

export default function ModalRedimensionnerImage({ editor, ouvert, onFermer, pos, largeurActuelle }: Props) {
    const [largeur, setLargeur] = useState(largeurActuelle);

    useEffect(() => {
        setLargeur(largeurActuelle);
    }, [largeurActuelle, ouvert]);

    function appliquer(valeur: string) {
        if (pos === null) return;
        editor.chain().focus().setNodeSelection(pos).updateAttributes("image", { width: valeur }).run();
    }

    function confirmer() {
        appliquer(largeur);
        onFermer();
    }

    function supprimerImage() {
        if (pos === null) return;
        editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
        onFermer();
    }

    return (
        <Modal ouvert={ouvert} titre="Redimensionner l'image" onFermer={onFermer} largeurMax="sm">
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    {TAILLES_PREDEFINIES.map((taille) => (
                        <button
                            key={taille.valeur}
                            type="button"
                            onClick={() => setLargeur(taille.valeur)}
                            className={`flex-1 cursor-pointer rounded-lg border py-2 text-sm font-medium transition ${largeur === taille.valeur ? "border-club-600 bg-club-50 text-club-700" : "border-club-200 text-club-600 hover:bg-club-50"
                                }`}
                        >
                            {taille.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="largeur" className="text-sm font-medium text-club-700">
                        Réglage précis ({largeur})
                    </label>
                    <input
                        id="largeur"
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={parseInt(largeur) || 100}
                        onChange={(e) => setLargeur(`${e.target.value}%`)}
                        className="w-full cursor-pointer accent-club-600"
                    />
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <button type="button" onClick={supprimerImage} className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
                        Supprimer l'image
                    </button>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onFermer} className="rounded-lg px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                            Annuler
                        </button>
                        <button type="button" onClick={confirmer} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700">
                            Appliquer
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}