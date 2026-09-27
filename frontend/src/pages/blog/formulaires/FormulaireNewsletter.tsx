/**
 * Champs propres à une newsletter : lien Canva et son aperçu (titre et chemin sont générés par useTitreNewsletter).
 */

import { TriangleAlert } from "lucide-react";
import VisualisationCanva from "../../../composants/blog/VisualisationCanva";
import type { FormulaireRedaction } from "../../../fonctions/blog/useFormulaireRedaction";

export default function FormulaireNewsletter({ redaction }: { redaction: FormulaireRedaction }) {
    const { valeur, erreurs, setValeur, setErreurs } = redaction;

    return (
        <>
            {/* URL Canvas */}
            <div>
                <label htmlFor="urlCanva" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                    URL Canvas
                </label>

                <input
                    id="urlCanva"
                    type="text"
                    value={valeur.urlCanva}
                    autoComplete="off"
                    onChange={(e) => {
                        const nouvelleValeur = e.target.value;
                        setValeur((v) => ({ ...v, urlCanva: nouvelleValeur }));
                    }}
                    placeholder="Ex. : https://canva.link/c7wayh13eoa9p9n"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200`}
                />
                {valeur.urlCanva && (
                    <>
                        <p className={`my-2 mb-1.5 block text-sm font-medium text-[#040F33]`}>Aperçu</p>
                        <VisualisationCanva url={valeur.urlCanva} setErreurs={setErreurs} />
                    </>
                )}

                {erreurs.urlCanva && <p className="mt-1 text-xs text-red-600">{erreurs.urlCanva}</p>}
            </div>
        </>
    );
}

/** Rappel affiché au-dessus des boutons d'enregistrement d'une newsletter. */
export function AvertissementNewsletter() {
    return (
        <div className="flex items-center justify-end gap-2">
            <TriangleAlert size={25} className="shrink-0" color="red" />
            <p className="text-sm text-right my-3">
                Les newsletters <span className="font-bold">ne sont pas modifiables</span>. Leur suppression est définitive, <span className="font-bold">vérifiez avant de continuer</span>.
            </p>
        </div>
    );
}
