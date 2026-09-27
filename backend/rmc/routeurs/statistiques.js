import e from "express";
import { enregistrementVue, envoiMailContreRendu, mailRapport, recuperationStatistiques } from "../controleurs/statistiques.js";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { detecterBot } from "../middlewares/detecterBot.js";
import { formulaireOuMailLimiteur } from "../middlewares/limiteurRequetes.js";
import { validerCorps } from "../middlewares/validerCorps.js";

const routeurStatistiques = e.Router()

// Enregistrement
routeurStatistiques.post("/vue", detecterBot, enregistrementVue)

// Récuperation
routeurStatistiques.get("/recuperation", accesAdmin, recuperationStatistiques)

// Envoi mail
routeurStatistiques.post("/mail", formulaireOuMailLimiteur, accesAdmin, validerCorps(["debut", "fin"]), envoiMailContreRendu)
routeurStatistiques.post("/mail-rapport", mailRapport)

export default routeurStatistiques;