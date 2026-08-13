import e from "express";
import { accesAdmin } from "../middlewares/accesAdmin.js";
import { cree, modifierCourse, recupererCoursesAccueil, suggestion, supprimerCourse, toutesLesCourses, toutesLesCoursesAdmin } from "../controleurs/courses.js";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";
import { formulaireOuMailLimiteur } from "../middlewares/limiteurRequetes.js";

const routeurCourses = e.Router()

routeurCourses.post("/cree", accesAdmin, cree)
routeurCourses.get("/toutes-les-courses", toutesLesCourses)
routeurCourses.get("/toutes-les-courses-admin", accesAdmin, toutesLesCoursesAdmin)
routeurCourses.delete("/supprimer", accesAdmin, supprimerCourse)
routeurCourses.post("/modifier", accesAdmin, modifierCourse)
routeurCourses.get("/courses-accueil", recupererCoursesAccueil)
routeurCourses.post("/suggestion", formulaireOuMailLimiteur, accesUtilisateur, suggestion)
export default routeurCourses