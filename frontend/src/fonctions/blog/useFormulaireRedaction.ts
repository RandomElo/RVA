/**
 * État et logique communs aux formulaires de rédaction (article et page statique) :
 * valeurs du formulaire, erreurs, éditeur, images, validation et déroulé de l'enregistrement.
 * Chaque formulaire fournit sa propre fonction d'envoi à l'API.
 *
 * Le back-office est protégé par un middleware "administrateur" côté route parente, ce hook ne refait pas ce contrôle.
 */

import { useCallback, useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useRequete } from "../requete";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useAuth } from "../../contexts/AuthContext";
import type { ArticleFormValue } from "../../constantes/types/blog";
import { validerRedaction, type ErreursRedaction, type TypeRedaction } from "../validationRedaction";
import type { StatutArticle } from "./enregistrementRedaction";
import { useEditeurArticle } from "./useEditeurArticle";
import { useImagesArticle } from "./useImagesArticle";

const VALEUR_INITIALE: ArticleFormValue = {
    titre: "",
    categorie: "actu_publique",
    url: "",
    imageUrl: "",
    urlCanva: "",
    contenuHtml: "",
    description: "",
    datePublication: new Date().toISOString().slice(0, 10),
    dansNavigation: false,
};

export function useFormulaireRedaction(type: TypeRedaction) {
    // Données de l'article ou de la page à modifier (routes d'édition), undefined en création.
    const donneesLoader = useLoaderData<ArticleFormValue | undefined>();
    const [valeur, setValeur] = useState<ArticleFormValue>(donneesLoader ?? VALEUR_INITIALE);
    const [erreurs, setErreurs] = useState<ErreursRedaction>({});
    const [erreurPresente, setErreurPresente] = useState<boolean>(false);
    const [enregistrementEnCours, setEnregistrementEnCours] = useState<StatutArticle | null>(null);

    const editeur = useEditeurArticle({ contenuHtml: valeur.contenuHtml, setValeur, setErreurs });
    const images = useImagesArticle();

    const navigation = useNavigate();
    const requete = useRequete();
    const { notifier } = useNotifications();
    const { role } = useAuth();

    useEffect(() => {
        document.title = "Rédaction article - Running Vincennes Association";
    }, []);

    const champ = useCallback(
        <K extends keyof ArticleFormValue>(cle: K) =>
            (val: ArticleFormValue[K]) => {
                setValeur((v) => ({ ...v, [cle]: val }));
                setErreurs((e) => ({ ...e, [cle]: undefined }));
            },
        [],
    );

    function valider(): boolean {
        const resultat = validerRedaction(valeur, type, editeur.estContenuVide());
        setErreurPresente(resultat.erreurPresente);
        setErreurs(resultat.erreurs);
        return Object.keys(resultat.erreurs).length === 0;
    }

    /**
     * Resynchronise le HTML canonique avec la vue active, valide (publication uniquement) puis appelle `envoyer`.
     * `envoyer` doit appeler `finEnregistrement` une fois la réponse traitée.
     */
    async function enregistrer(statut: StatutArticle, envoyer: (valeurFinale: ArticleFormValue, statut: StatutArticle) => Promise<void>) {
        const valeurFinale = { ...valeur, contenuHtml: editeur.contenuFinal() };
        setValeur(valeurFinale);

        if (statut === "publie" && !valider()) return;
        setEnregistrementEnCours(statut);

        await envoyer(valeurFinale, statut);
    }

    function finEnregistrement() {
        setEnregistrementEnCours(null);
    }

    return {
        type,
        donneesLoader,
        valeur,
        setValeur,
        erreurs,
        setErreurs,
        erreurPresente,
        enregistrementEnCours,
        champ,
        editeur,
        images,
        navigation,
        requete,
        notifier,
        role,
        enregistrer,
        finEnregistrement,
    };
}

export type FormulaireRedaction = ReturnType<typeof useFormulaireRedaction>;
