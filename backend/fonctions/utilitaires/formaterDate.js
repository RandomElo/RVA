export const formaterDate = (date) =>
    new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(date));

