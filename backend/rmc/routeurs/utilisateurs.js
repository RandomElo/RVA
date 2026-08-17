import e from "express"
import { ajouterPhotosZip, anniversaireDuJour, anniversaires, changementMdp, connexionGoogle, connexionParMail, deconnexion, enregistrerPhotoControleur, exporterDonnees, inviterAdherent, inviterAdherentCsv, modifierInformationsUtilisateur, photo, recupererUtilisateurs, relancerInitialisationCompte, supprimer, supprimerPhoto, trombinoscope, verification, verificationCode, verifierMotDePasse } from "../controleurs/utilisateurs.js"
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { enregistrerTrombinoscope } from "../../fonctions/utilitaires/enregistrementPhoto.js";
import multer from "multer";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";
import { authLimiteur, uploadLimiteur } from "../middlewares/limiteurRequetes.js";

const upload = multer({ storage: multer.memoryStorage() });

const routeurUtilisateurs = e.Router()

// Connexion
routeurUtilisateurs.post("/connexion-par-mail", authLimiteur, connexionParMail)
routeurUtilisateurs.post("/connexion-google", authLimiteur, connexionGoogle)
routeurUtilisateurs.post("/verification-mdp", authLimiteur, verifierMotDePasse)
routeurUtilisateurs.post("/verification-code", authLimiteur, verificationCode)

// Trombinoscope
routeurUtilisateurs.get("/trombinoscope", trombinoscope)
routeurUtilisateurs.get("/photo/:nomFichier", photo)
routeurUtilisateurs.post("/ajouter-photo/:id", accesAdmin, enregistrerTrombinoscope.single("photo"), enregistrerPhotoControleur)
routeurUtilisateurs.post("/ajouter-photos-zip", uploadLimiteur, accesAdmin, upload.single("zip"), ajouterPhotosZip)
routeurUtilisateurs.delete("/supprimer-photo", accesAdmin, supprimerPhoto)

// Invitations
routeurUtilisateurs.post("/inviter", accesAdmin, inviterAdherent)
routeurUtilisateurs.post("/inviter-csv", uploadLimiteur, accesAdmin, upload.single("csv"), inviterAdherentCsv)

// Édition
routeurUtilisateurs.delete("/supprimer", accesAdmin, supprimer)
routeurUtilisateurs.post("/modifier", accesAdmin, modifierInformationsUtilisateur)

// Autres
routeurUtilisateurs.get("/verification", verification);
routeurUtilisateurs.delete("/deconnexion", accesUtilisateur, deconnexion)

// Actions administrateurs
routeurUtilisateurs.get("/recuperer-utilisateurs", accesAdmin, recupererUtilisateurs)
routeurUtilisateurs.get("/exporter/:id", accesAdmin, exporterDonnees)
routeurUtilisateurs.post("/relancer-mail-initialisation", accesAdmin, relancerInitialisationCompte)
routeurUtilisateurs.post("/changement-mdp", accesAdmin, changementMdp)

// Anniversaire
routeurUtilisateurs.get("/anniversaires-du-jour", accesUtilisateur, anniversaireDuJour);
routeurUtilisateurs.get("/anniversaires", accesUtilisateur, anniversaires)

export default routeurUtilisateurs