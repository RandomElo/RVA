import e from "express";
import { cree, modifier, recupererArticle, recupererArticleAdmin, recupererQlqArticles, recupererTousArticles, recupererTousArticlesAdmin, suggestion, supprimer } from "../controleurs/blog/articles.js";
import { canvaVisualisation, enregistrerNewsletter, recupererNewsletter } from "../controleurs/blog/newsletter.js";
import { creeAlbum, modifierAlbum, recupererAlbum } from "../controleurs/blog/albums.js";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";
import { formulaireOuMailLimiteur } from "../middlewares/limiteurRequetes.js";
import { validerCorps } from "../middlewares/validerCorps.js";

const routeurArticles = e.Router()

routeurArticles.get("/recuperer-article/:url", recupererArticle)
routeurArticles.get("/recuperer-tous-articles", recupererTousArticles)
routeurArticles.get("/recuperer-qlq-articles", recupererQlqArticles)

routeurArticles.post("/cree", accesAdmin, validerCorps(["article", "statut"]), cree)
routeurArticles.post("/modifier", accesAdmin, modifier)
routeurArticles.get("/recuperer-tous-articles-admin", accesAdmin, recupererTousArticlesAdmin)
routeurArticles.get("/recuperer-article-admin/:url", accesAdmin, recupererArticleAdmin)
routeurArticles.delete("/supprimer", accesAdmin, validerCorps(["nom"]), supprimer)
routeurArticles.get("/apercu-canva", accesAdmin, canvaVisualisation)

// Newsletter
routeurArticles.post("/cree-newsletter", accesAdmin, enregistrerNewsletter)
routeurArticles.get("/recuperer-newsletter/:chemin", accesUtilisateur, recupererNewsletter)
routeurArticles.post("/suggestion", formulaireOuMailLimiteur, accesUtilisateur, validerCorps(["article"]), suggestion)

// Album
routeurArticles.post("/cree-album", accesAdmin, creeAlbum)
routeurArticles.get("/recuperer-album", accesAdmin, recupererAlbum)
routeurArticles.post("/modifier-album", accesAdmin, modifierAlbum)
export default routeurArticles