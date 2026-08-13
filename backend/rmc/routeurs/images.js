import e from "express";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { afficher, ajouterGalerie, recupererGalerie, recupererTout, remplacer, supprimerPhotoGalerie, verifierUtilisationImagesDansArticles } from "../controleurs/images.js";
import { enregistrerPhotoGalerie } from "../../fonctions/utilitaires/enregistrementPhoto.js";
import multer from "multer";
import { uploadLimiteur } from "../middlewares/limiteurRequetes.js";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";

const upload = multer({ storage: multer.memoryStorage() });

const routeurImages = e.Router()

routeurImages.get("/recuperer-galerie", accesUtilisateur, recupererGalerie)
routeurImages.get("/recuperer-tout", accesUtilisateur, recupererTout)
routeurImages.post("/ajouter", uploadLimiteur, accesUtilisateur, enregistrerPhotoGalerie.single("image"), ajouterGalerie)
routeurImages.get("/i/:nomFichier", afficher)
routeurImages.post("/remplacer", accesUtilisateur, accesAdmin, upload.single("image"), remplacer)
routeurImages.get("/recuperer-details-utilisation", accesAdmin, verifierUtilisationImagesDansArticles)
routeurImages.delete("/supprimer-image-galerie", accesAdmin, supprimerPhotoGalerie)

export default routeurImages