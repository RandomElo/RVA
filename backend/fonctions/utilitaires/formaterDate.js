// Les appelants passent des dates "AAAA-MM-JJ", que `new Date()` interprète à minuit UTC :
// on formate donc en UTC pour ne pas afficher la veille sur un serveur à l'ouest de Greenwich.
export const formaterDate = (date) =>
    new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(date));

// Date du jour "AAAA-MM-JJ" à Paris (l'association y est), indépendante du fuseau du serveur.
// Comparable directement, en tant que chaîne, à une date "AAAA-MM-JJ" validée.
export const dateDuJour = () =>
    new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Europe/Paris",
    }).format(new Date());

