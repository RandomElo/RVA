import e from "express";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { recupererArboresence, modifierTextesPage, recupererTextesPage, creation, supprimer, detailsPage, detailsPageAdmin, modification, navbar } from "../controleurs/pages.js";

const routeurPages = e.Router()

routeurPages.get("/recuperer-arboresence", accesAdmin, recupererArboresence)
routeurPages.get("/:nom/liste-textes-page", recupererTextesPage)
routeurPages.post("/:nom/modifier-textes-page", accesAdmin, modifierTextesPage)
routeurPages.post("/creation", accesAdmin, creation)
routeurPages.get("/details", detailsPage)
routeurPages.get("/details-admin/:url", accesAdmin, detailsPageAdmin)
routeurPages.delete("/supprimer", accesAdmin, supprimer)
routeurPages.post("/modification", accesAdmin, modification)
routeurPages.get("/navbar", navbar)
export default routeurPages