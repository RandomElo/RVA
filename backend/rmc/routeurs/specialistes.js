import e from "express";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { cree, modifierSpecialiste, recuperer, recupererAdmin, suggestion, supprimer } from "../controleurs/specialistes.js";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";
import { formulaireOuMailLimiteur } from "../middlewares/limiteurRequetes.js";

const routeurSpecialistes = e.Router()

routeurSpecialistes.get("/recuperer", recuperer)
routeurSpecialistes.get("/toutes-les-specialistes-admin", accesAdmin, recupererAdmin)
routeurSpecialistes.post("/cree", accesAdmin, cree)
routeurSpecialistes.post("/modifier", accesAdmin, modifierSpecialiste)
routeurSpecialistes.post("/suggestion", formulaireOuMailLimiteur, accesUtilisateur, suggestion)
routeurSpecialistes.delete("/supprimer", accesAdmin, supprimer)

export default routeurSpecialistes