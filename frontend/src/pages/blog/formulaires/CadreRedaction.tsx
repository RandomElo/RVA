/**
 * Mise en page commune des formulaires de rédaction : lien retour, en-tête, formulaire, barre d'actions
 * et modales d'images (insertion dans l'éditeur, couverture, redimensionnement).
 */

import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import ModalRedimensionnerImage from "../../../composants/modal/blog/ModalRedimensionnerImage";
import ModalAjouterImage from "../../../composants/modal/blog/ModalAjouterImage";
import type { FormulaireRedaction } from "../../../fonctions/blog/useFormulaireRedaction";

type Props = {
    redaction: FormulaireRedaction;
    titre: string;
    /** Fin de la phrase d'introduction : "Remplissez le formulaire ci-dessous, <consigne>." */
    consigne: string;
    /** Affiché entre l'en-tête et le formulaire. */
    avertissement?: ReactNode;
    /** Affiché en haut de la barre d'actions. */
    avertissementActions?: ReactNode;
    onPublier: () => void;
    onAnnuler: () => void;
    /** Boutons d'enregistrement, à droite du bouton Annuler. */
    boutons: ReactNode;
    children: ReactNode;
};

export default function CadreRedaction({ redaction, titre, consigne, avertissement, avertissementActions, onPublier, onAnnuler, boutons, children }: Props) {
    const { role, erreurPresente, editeur, images, champ } = redaction;

    return (
        <div className="mx-auto max-w-3xl px-6 py-10">
            <div className="mb-3">
                {role == "administrateur" ? (
                    <RouterLink to="/administration" className="font-body text-sm text-club-600 hover:text-club-700">
                        ← Interface administration
                    </RouterLink>
                ) : (
                    ""
                )}
            </div>

            <header className="mb-8">
                <h1 className="font-display text-2xl font-bold text-[#040F33] sm:text-3xl">{titre}</h1>
                <p className="mt-1 text-sm text-[#0B2270]/70">Remplissez le formulaire ci-dessous, {consigne}.</p>
            </header>
            {avertissement}
            <form
                className="flex flex-col gap-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    onPublier();
                }}
            >
                {children}

                {/* Actions */}
                <div className="border-t border-club-100 pb-4">
                    {avertissementActions}

                    {/* Erreurs */}
                    {erreurPresente && (
                        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 mt-2 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <p>Au moins une erreur empêche la publication de l'article. Vérifiez les champs signalés en rouge ci-dessus.</p>
                        </div>
                    )}
                    <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onAnnuler} className="rounded-lg border border-club-200 px-5 py-2.5 text-sm font-medium text-[#0B2270] transition hover:bg-club-50 cursor-pointer">
                            Annuler
                        </button>
                        {boutons}
                    </div>
                </div>
            </form>

            <ModalAjouterImage ouvert={images.modalImageOuverte} onFermer={() => images.setModalImageOuverte(false)} editor={editeur.editor} images={images.images} setImages={images.setImages} type="galerieEtNouvelleImage" />

            <ModalAjouterImage ouvert={images.modalCouvertureOuverte} onFermer={() => images.setModalCouvertureOuverte(false)} type="galerieEtNouvelleImage" images={images.images} setImages={images.setImages} onImageSelectionnee={(url) => champ("imageUrl")(url)} />

            {/* Modale de redimensionnement d'une image de l'éditeur */}
            <ModalRedimensionnerImage editor={editeur.editor} ouvert={editeur.modalImageRedim.ouvert} pos={editeur.modalImageRedim.pos} largeurActuelle={editeur.modalImageRedim.largeur} onFermer={editeur.fermerModalImageRedim} />
        </div>
    );
}
