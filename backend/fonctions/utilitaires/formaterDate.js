// Les appelants passent des dates "AAAA-MM-JJ", que `new Date()` interprète à minuit UTC :
// on formate donc en UTC pour ne pas afficher la veille sur un serveur à l'ouest de Greenwich.
export const formaterDate = (date) =>
    new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(date));

