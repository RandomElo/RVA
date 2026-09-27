import e from "express"
import { connexionParMail, deconnexion, verification, verificationCode, verifierMotDePasse } from "../controleurs/auth/connexion.js"
import { connexionGoogle } from "../controleurs/auth/google.js"
import { changementMdp } from "../controleurs/auth/motDePasse.js"
import { inviterAdherent, modifierInformationsUtilisateur, recupererUtilisateurs, relancerInitialisationCompte, supprimer, trombinoscope } from "../controleurs/utilisateurs/adherents.js"
import { enregistrerPhotoControleur, photo, supprimerPhoto } from "../controleurs/utilisateurs/photos.js"
import { ajouterPhotosZip, inviterAdherentCsv } from "../controleurs/utilisateurs/import.js"
import { exporterDonnees } from "../controleurs/utilisateurs/export.js"
import { anniversaireDuJour, anniversaires } from "../controleurs/utilisateurs/anniversaires.js"
import { envoiMailAdherents } from "../controleurs/utilisateurs/mails.js"

import { accesAdmin } from "../middlewares/accesAdmin.js";

import { enregistrerPiecesJointesMail, enregistrerTrombinoscope } from "../../fonctions/utilitaires/enregistrementPhoto.js";
import multer from "multer";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";
import { authLimiteur, uploadLimiteur } from "../middlewares/limiteurRequetes.js";
import { validerCorps } from "../middlewares/validerCorps.js";

const upload = multer({ storage: multer.memoryStorage() });

const champsAdherent = validerCorps(["prenom", "nom", "mail", "dateNaissance"]);

const routeurUtilisateurs = e.Router()

// Connexion
routeurUtilisateurs.post("/connexion-par-mail", authLimiteur, validerCorps(["mail"]), connexionParMail)
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
routeurUtilisateurs.post("/inviter", accesAdmin, champsAdherent, inviterAdherent)
routeurUtilisateurs.post("/inviter-csv", uploadLimiteur, accesAdmin, upload.single("csv"), inviterAdherentCsv)

// Édition
routeurUtilisateurs.delete("/supprimer", accesAdmin, validerCorps(["nom"]), supprimer)
routeurUtilisateurs.post("/modifier", accesAdmin, champsAdherent, modifierInformationsUtilisateur)

// Autres
routeurUtilisateurs.get("/verification", verification);
routeurUtilisateurs.delete("/deconnexion", accesUtilisateur, deconnexion)

// Actions administrateurs
routeurUtilisateurs.get("/recuperer-utilisateurs", accesAdmin, recupererUtilisateurs)
routeurUtilisateurs.get("/exporter/:id", accesAdmin, exporterDonnees)
routeurUtilisateurs.post("/relancer-mail-initialisation", accesAdmin, relancerInitialisationCompte)
routeurUtilisateurs.post("/changement-mdp", accesAdmin, changementMdp)
routeurUtilisateurs.post("/envoyer-mail-adherents", accesAdmin, enregistrerPiecesJointesMail.array("piecesJointes", 10), envoiMailAdherents)

// Anniversaire
routeurUtilisateurs.get("/anniversaires-du-jour", accesUtilisateur, anniversaireDuJour);
routeurUtilisateurs.get("/anniversaires", accesUtilisateur, anniversaires)

export default routeurUtilisateurs