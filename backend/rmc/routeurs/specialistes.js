import e from "express";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { cree, modifierSpecialiste, recuperer, recupererAdmin, suggestion, supprimer } from "../controleurs/specialistes.js";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";
import { formulaireOuMailLimiteur } from "../middlewares/limiteurRequetes.js";
import { validerCorps } from "../middlewares/validerCorps.js";

const champsSpecialiste = validerCorps(["nom", "specialite", "detail", "adresse"]);

const routeurSpecialistes = e.Router()

routeurSpecialistes.get("/recuperer", recuperer)
routeurSpecialistes.get("/toutes-les-specialistes-admin", accesAdmin, recupererAdmin)
routeurSpecialistes.post("/cree", accesAdmin, champsSpecialiste, cree)
routeurSpecialistes.post("/modifier", accesAdmin, champsSpecialiste, modifierSpecialiste)
routeurSpecialistes.post("/suggestion", formulaireOuMailLimiteur, accesUtilisateur, champsSpecialiste, suggestion)
routeurSpecialistes.delete("/supprimer", accesAdmin, validerCorps(["nom"]), supprimer)

export default routeurSpecialistes