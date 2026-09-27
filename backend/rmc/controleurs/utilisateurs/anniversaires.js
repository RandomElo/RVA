import gestionErreur from "../../middlewares/gestionErreur.js";

export const anniversaireDuJour = gestionErreur(async (req, res) => {
    const date = new Date();

    const dateFormatee = date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit"
    });

    const listeAnniversaires = await req.Utilisateurs.findAll({
        where: { dateNaissance: dateFormatee, role: "adherent" },
        attributes: ["id", "nom", "prenom"],
        raw: true
    })

    return res.json({ etat: true, detail: listeAnniversaires })
}, "controleurRecuperationAnniversairesJour", "Erreur lors de la récupération des anniversaires du jour")

export const anniversaires = gestionErreur(async (req, res) => {
    const donnees = await req.Utilisateurs.findAll({
        where: { role: "adherent" },
        attributes: ["id", "prenom", "nom", "dateNaissance", 'cheminTrombinoscope'],
        raw: true
    })
    return res.json({ etat: true, detail: donnees })
}, "controleurRecuperationAnniversaires", "Erreur lors de la récupération des anniversaires")