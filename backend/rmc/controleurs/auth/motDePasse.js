import gestionErreur from "../../middlewares/gestionErreur.js";
import bcrypt from "bcrypt"

export const changementMdp = gestionErreur(async (req, res) => {
    const { ancienMdp, nouveauMdp } = req.body;

    if (!ancienMdp || !nouveauMdp) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte.",
        });
    }

    const REGEX_MDP = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#+=])[A-Za-z\d@$!%*?&_\-#+=]{16,}$/;
    if (!REGEX_MDP.test(nouveauMdp)) {
        return res.json({ etat: true, detail: { changer: false, detail: "Mot de passe non conforme aux critères" } });
    }

    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur)

    const mdpValide = await bcrypt.compare(ancienMdp, utilisateur.motDePasse);
    if (!mdpValide) {
        return res.json({ etat: true, detail: { changer: false, detail: "Mot de passe incorrect" } });
    }

    const motDePasseHash = await bcrypt.hash(nouveauMdp, 12);
    await utilisateur.update({ motDePasse: motDePasseHash })

    res.clearCookie("utilisateur", {
        httpOnly: true,
        sameSite: "Strict",
        secure: process.env.MODE == "production",
    });

    return res.json({ etat: true, detail: { changer: true, detail: "Mot de passe mis à jour" } });
}, "controleurChangementMdp", "Erreur lors du changement de mot de passe")