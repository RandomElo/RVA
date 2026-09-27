import e from "express";
import { detailsInterfaceAdministration, envoyerMailContact, gestionToken, healthCheck, verifierCaptcha } from "../controleurs/autres.js";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { authLimiteur, formulaireOuMailLimiteur } from "../middlewares/limiteurRequetes.js";
import { validerCorps } from "../middlewares/validerCorps.js";

const routeurAutres = e.Router()

routeurAutres.post("/token", authLimiteur, validerCorps(["token"]), gestionToken)
routeurAutres.post("/envoyer-mail-contact", formulaireOuMailLimiteur, validerCorps(["nom", "mail", "message"]), envoyerMailContact)
routeurAutres.get("/details-interface-administration", accesAdmin, detailsInterfaceAdministration)
routeurAutres.get("/health-check", healthCheck)
routeurAutres.post("/verifier-captcha", verifierCaptcha)
export default routeurAutres