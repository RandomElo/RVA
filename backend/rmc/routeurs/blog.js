import e from "express";
import { canvaVisualisation, cree, enregistrerNewsletter, modifier, recupererArticle, recupererArticleAdmin, recupererNewsletter, recupererQlqArticles, recupererTousArticles, recupererTousArticlesAdmin, suggestion, supprimer } from "../controleurs/blog.js";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";
import { formulaireOuMailLimiteur } from "../middlewares/limiteurRequetes.js";

const routeurArticles = e.Router()

routeurArticles.get("/recuperer-article/:url", recupererArticle)
routeurArticles.get("/recuperer-tous-articles", recupererTousArticles)
routeurArticles.get("/recuperer-qlq-articles", recupererQlqArticles)

routeurArticles.post("/cree", accesAdmin, cree)
routeurArticles.post("/modifier", accesAdmin, modifier)
routeurArticles.get("/recuperer-tous-articles-admin", accesAdmin, recupererTousArticlesAdmin)
routeurArticles.get("/recuperer-article-admin/:url", accesAdmin, recupererArticleAdmin)
routeurArticles.delete("/supprimer", accesAdmin, supprimer)
routeurArticles.get("/apercu-canva", accesAdmin, canvaVisualisation)

// Newsletter
routeurArticles.post("/cree-newsletter", accesAdmin, enregistrerNewsletter)
routeurArticles.get("/recuperer-newsletter/:chemin", accesUtilisateur, recupererNewsletter)
routeurArticles.post("/suggestion", formulaireOuMailLimiteur, accesUtilisateur, suggestion)

export default routeurArticles