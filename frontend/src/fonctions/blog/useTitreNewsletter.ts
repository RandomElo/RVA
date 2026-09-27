/**
 * Newsletter : titre et chemin sont générés à partir de la date de publication (champs verrouillés),
 * et vidés quand on quitte la catégorie "newsletter".
 */

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { ArticleFormValue, Categorie } from "../../constantes/types/blog";
import { genererTitreNewsletter } from "./enregistrementRedaction";

export function useTitreNewsletter(valeur: ArticleFormValue, setValeur: Dispatch<SetStateAction<ArticleFormValue>>, champ: <K extends keyof ArticleFormValue>(cle: K) => (val: ArticleFormValue[K]) => void) {
    const categoriePrecedenteRef = useRef<Categorie | undefined>(valeur?.categorie);

    useEffect(() => {
        function gestionInitialisationNewsLetter() {
            const categoriePrecedente = categoriePrecedenteRef.current;
            categoriePrecedenteRef.current = valeur?.categorie;

            if (valeur?.categorie === "newsletter") {
                // On entre dans "newsletter" : on génère titre/url (cas normal, pas un reset).
            } else {
                // On ne reset titre/url QUE si on vient de quitter "newsletter".
                if (categoriePrecedente !== "newsletter") return;
                champ("titre")("");
                setValeur((v) => ({ ...v, url: "" }));
                return;
            }

            if (!valeur?.datePublication) return;

            const { titre: titreGenere, url: urlGeneree } = genererTitreNewsletter(valeur.datePublication);

            // Mise à jour sécurisée en vérifiant si le changement est vraiment nécessaire
            setValeur((v) => {
                if (v.titre === titreGenere && v.url === urlGeneree) return v; // Évite les re-renders inutiles
                return { ...v, titre: titreGenere, url: urlGeneree };
            });
        }
        gestionInitialisationNewsLetter();
    }, [valeur?.categorie, valeur?.datePublication, champ, setValeur]);
}
