// Refuse la requête (400) dès qu'un champ obligatoire du corps est absent ou falsy ("", 0, false, null),
// soit exactement la sémantique des contrôles `if (!champ)` qu'il remplace dans les contrôleurs.
// Un corps absent (requête sans JSON) est traité comme un corps vide.
// À placer après les middlewares d'accès (le 403 reste prioritaire) et après multer sur les routes multipart.
export const validerCorps = (champsRequis) => (req, res, next) => {
    const corps = req.body ?? {};
    if (champsRequis.some((champ) => !corps[champ])) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte" });
    }
    next();
};
