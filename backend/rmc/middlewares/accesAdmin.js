export const accesAdmin = async (req, res, next) => {
    if (!req.idUtilisateur) {
        return res.status(403).json({ etat: false, detail: "Vous n'êtes pas connecté" });
    }
    
    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true });

    if (utilisateur.role != "administrateur") {
        return res.status(403).json({ etat: false, detail: "Vous n'êtes pas connecté" });
    }

    next();
};
