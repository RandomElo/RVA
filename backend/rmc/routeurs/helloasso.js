import e from "express";
import { callbackHelloAsso, creerFormulaire, initerConnexionHelloAsso, modifierFormulaire, recuperationForms, recuperationFormulaireParSlug, recuperationReponsesFormulaire, statutConnexionHelloAsso, supprimerFormulaire } from "../controleurs/helloasso.js";
import { accesAdmin } from "../middlewares/accesAdmin.js";

const routeurHelloasso = e.Router()
routeurHelloasso.get("/login", accesAdmin, initerConnexionHelloAsso)
routeurHelloasso.get("/callback", callbackHelloAsso)
routeurHelloasso.get("/statut-connexion", accesAdmin, statutConnexionHelloAsso);
routeurHelloasso.get("/recuperation-forms", accesAdmin, recuperationForms)
routeurHelloasso.get('/forms/:formType/:formSlug', accesAdmin, recuperationFormulaireParSlug);
routeurHelloasso.get('/items/:formType/:formSlug', accesAdmin, recuperationReponsesFormulaire);
routeurHelloasso.post("/creer", accesAdmin, creerFormulaire);
routeurHelloasso.post("/modifier", accesAdmin, modifierFormulaire);
routeurHelloasso.delete("/supprimer/:categorie/:formSlug", accesAdmin, supprimerFormulaire);
export default routeurHelloasso