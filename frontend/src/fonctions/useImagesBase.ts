const NOM_CACHE_IMAGES = "rva-cache-images";

export function useCacheImage() {
    return async (urlImage: string): Promise<string> => {
        // 1. Ouvrir l'espace de stockage des requêtes du navigateur
        const cache = await caches.open(NOM_CACHE_IMAGES);
        const reponseEnCache = await cache.match(urlImage);

        // 2. Tâche d'arrière-plan (Revalidation silencieuse)
        const revaliderArrierePlan = async () => {
            try {
                const headers: HeadersInit = {};

                // Si on a déjà l'image en cache, on récupère son ETag
                if (reponseEnCache) {
                    const etag = reponseEnCache.headers.get("ETag");
                    if (etag) headers["If-None-Match"] = etag;
                }

                const reponseReseau = await fetch(urlImage, { headers });

                // Si le serveur renvoie 304 (Pas modifié), on ne fait rien
                if (reponseReseau.status === 304) return;

                // Si l'image a changé ou est nouvelle, on met à jour le cache
                if (reponseReseau.ok) {
                    await cache.put(urlImage, reponseReseau);
                }
            } catch (erreur) {
                console.warn(`[Cache Image] Échec de revalidation pour ${urlImage}:`, erreur);
            }
        };

        // Lancer la vérification en arrière-plan sans bloquer
        revaliderArrierePlan();

        // 3. Si l'image existe déjà en cache local, on génère une URL blob instantanée
        if (reponseEnCache) {
            const blob = await reponseEnCache.blob();
            return URL.createObjectURL(blob);
        }

        // Sinon, on retourne directement l'URL réseau d'origine le temps du 1er téléchargement
        return urlImage;
    };
}
