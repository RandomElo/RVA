/**
 * Champs et boutons partagés par les formulaires de rédaction (article et page statique).
 */

import { Loader2 } from "lucide-react";
import type { FormulaireRedaction } from "../../../fonctions/blog/useFormulaireRedaction";
import { MESSAGE_SLUG, REGEX_SLUG } from "../../../fonctions/validationRedaction";

export function ChampTitre({ redaction }: { redaction: FormulaireRedaction }) {
    const { valeur, erreurs, champ } = redaction;

    return (
        <div>
            <label htmlFor="titre" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                Titre
            </label>
            <input id="titre" type="text" value={valeur.titre} disabled={valeur.categorie == "newsletter"} onChange={(e) => champ("titre")(e.target.value)} placeholder="Ex. : Retour sur le Téléthon 2026" className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${erreurs.titre ? "border-red-400" : "border-club-200"}`} />
            {erreurs.titre && <p className="mt-1 text-xs text-red-600">{erreurs.titre}</p>}
        </div>
    );
}

/** Chemin d'accès, vérifié à la frappe ; `prefixe` : début du chemin public affiché dans l'aide ("/blog/" ou "/"). */
export function ChampUrl({ redaction, prefixe }: { redaction: FormulaireRedaction; prefixe: string }) {
    const { valeur, erreurs, setValeur, setErreurs } = redaction;

    return (
        <div>
            <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                Chemin d'accès
            </label>

            <input
                id="url"
                type="text"
                disabled={valeur.categorie == "newsletter"}
                value={valeur.url}
                onChange={(e) => {
                    const nouvelleValeur = e.target.value;
                    setValeur((v) => ({ ...v, url: nouvelleValeur }));

                    setErreurs((err) => ({
                        ...err,
                        url: nouvelleValeur && !REGEX_SLUG.test(nouvelleValeur) ? MESSAGE_SLUG : undefined,
                    }));
                }}
                placeholder="Ex. : telethon-2026"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${erreurs.url ? "border-red-400" : "border-club-200"}`}
            />

            {valeur.url && <p className="mt-1.5 text-xs text-[#0B2270]/50">La page sera accessible par l'url : {"https://" + window.location.hostname + prefixe + valeur.url} .</p>}

            {erreurs.url && <p className="mt-1 text-xs text-red-600">{erreurs.url}</p>}
        </div>
    );
}

/** Bouton de publication (submit du formulaire), avec indicateur de chargement. */
export function BoutonPublier({ redaction, libelle }: { redaction: FormulaireRedaction; libelle: string }) {
    const { enregistrementEnCours } = redaction;

    return (
        <button type="submit" disabled={enregistrementEnCours !== null} className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ">
            {enregistrementEnCours === "publie" && <Loader2 size={16} className="animate-spin" />}
            {libelle}
        </button>
    );
}
