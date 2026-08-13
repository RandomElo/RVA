const PREFIXE_CACHE = "rva-cache-json_";

type CachePersistant<T> = {
    donnees: T;
    etag?: string | null;
    horodatage: number;
};

export function useRequeteJSON() {
    return async <T = any>(chemin: string, callbackMiseAJour?: (nouvellesDonnees: T) => void): Promise<T | null> => {
        const cleCache = `${PREFIXE_CACHE}${chemin}`;

        // 1. Charger depuis localStorage (Infiniment conservé pour un affichage 0ms)
        let cacheLocal: CachePersistant<T> | null = null;
        const cacheBrut = localStorage.getItem(cleCache);

        if (cacheBrut) {
            try {
                cacheLocal = JSON.parse(cacheBrut);
            } catch {
                localStorage.removeItem(cleCache);
            }
        }

        // 2. Requête en arrière-plan (Revalidation) avec en-têtes conditionnels
        const verifierMiseAJour = async () => {
            try {
                const headers: HeadersInit = {};
                if (cacheLocal?.etag) {
                    // Le serveur renverra 304 Not Modified si le fichier n'a PAS changé !
                    headers["If-None-Match"] = cacheLocal.etag;
                }

                const reponse = await fetch(`/textes/${chemin}.json`, { headers });
                // Code 304 : Le fichier JSON n'a PAS bougé sur le serveur
                if (reponse.status === 304) {
                    return;
                }

                if (reponse.ok) {
                    const nouvellesDonnees = await reponse.json();
                    const etag = reponse.headers.get("ETag");

                    // Sauvegarder la nouvelle version dans le localStorage
                    const nouveauCache: CachePersistant<T> = {
                        donnees: nouvellesDonnees,
                        etag,
                        horodatage: Date.now(),
                    };
                    localStorage.setItem(cleCache, JSON.stringify(nouveauCache));

                    // Si les données ont changé et qu'on a un callback, on prévient le composant
                    if (callbackMiseAJour) {
                        callbackMiseAJour(nouvellesDonnees);
                    }
                }
            } catch (erreur) {
                console.warn(`[Cache] Impossible de revalider ${chemin}:`, erreur);
            }
        };

        // Lancer la vérification en arrière-plan sans bloquer
        verifierMiseAJour();

        // 3. Retourner immédiatement la version en cache (si elle existe)
        return cacheLocal ? cacheLocal.donnees : null;
    };
}
