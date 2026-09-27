import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useRequete } from "./requete";

type Options<T> = {
    /** Route GET renvoyant la liste complète des éléments. */
    url: string;
    /**
     * Garde un élément selon l'onglet actif et la recherche (déjà passée en minuscules et sans espaces autour).
     * Doit être une référence stable (fonction de module ou useCallback) pour que le filtrage reste mémoïsé.
     */
    filtrer: (element: T, onglet: string, recherche: string) => boolean;
    /** Tri appliqué après filtrage ; même contrainte de stabilité que `filtrer`. */
    comparer?: (a: T, b: T) => number;
};

/**
 * Liste d'un écran d'administration : chargement, onglet, recherche et tri.
 * `donnees` vaut null tant que le premier chargement n'a pas abouti ; un chargement en échec ne remplace pas une liste déjà chargée.
 */
export function useListeAdmin<T>({ url, filtrer, comparer }: Options<T>) {
    const [donnees, setDonnees] = useState<T[] | null>(null);
    const [onglet, setOnglet] = useState<string>("tous");
    const [recherche, setRecherche] = useState("");
    const requete = useRequete();

    const recuperer = useEffectEvent((adresse: string) => requete<T[]>({ url: adresse }));

    useEffect(() => {
        let actif = true;
        recuperer(url).then((resultat) => {
            if (actif && resultat) setDonnees(resultat);
        });
        return () => {
            actif = false;
        };
    }, [url]);

    const elementsFiltres = useMemo(() => {
        if (!donnees) return [];
        const q = recherche.trim().toLowerCase();
        const filtres = donnees.filter((element) => filtrer(element, onglet, q));
        return comparer ? filtres.sort(comparer) : filtres;
    }, [donnees, onglet, recherche, filtrer, comparer]);

    return {
        donnees,
        setDonnees,
        elementsFiltres,
        enChargement: donnees === null,
        onglet,
        setOnglet,
        recherche,
        setRecherche,
    };
}
