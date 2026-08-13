import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { signalerVuePage } from "./apiStatistiques";

// Préfixe(s) de routes jamais trackées, même si le hook est monté dessus
// (utile quand un seul layout racine englobe TOUTES les routes, admin comprise).
const PREFIXES_NON_TRACKES = ["/administration"];

function estUneRouteAdmin(pathname: string) {
    return PREFIXES_NON_TRACKES.some((prefixe) => pathname.startsWith(prefixe));
}

/**
 * À placer une seule fois, tout en haut de l'arbre (ex: dans le layout
 * racine "Generale"), sans condition. Le hook lui-même ignore les routes
 * admin (voir PREFIXES_NON_TRACKES) — le backend filtre de toute façon
 * par rôle côté serveur, ceci est une ceinture de sécurité côté front
 * qui évite en plus d'envoyer une requête inutile.
 */
export function useSuiviPage() {
    const { pathname } = useLocation();

    useEffect(() => {
        if (estUneRouteAdmin(pathname)) return;
        signalerVuePage(pathname);
    }, [pathname]);
}
