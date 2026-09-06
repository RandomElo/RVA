import e from "express";
import { detailsInterfaceAdministration, envoyerMailContact, gestionToken, healthCheck, verifierCaptcha } from "../controleurs/autres.js";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { authLimiteur, formulaireOuMailLimiteur } from "../middlewares/limiteurRequetes.js";

const routeurAutres = e.Router()

routeurAutres.post("/token", authLimiteur, gestionToken)
routeurAutres.post("/envoyer-mail-contact", formulaireOuMailLimiteur, envoyerMailContact)
routeurAutres.get("/details-interface-administration", accesAdmin, detailsInterfaceAdministration)
routeurAutres.get("/health-check", healthCheck)
routeurAutres.post("/verifier-captcha", verifierCaptcha)
export default routeurAutres