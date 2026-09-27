/**
 * Page de rédaction : article de blog (y compris newsletter et album photo) ou page statique.
 * Point d'entrée des routes (voir App.tsx) ; en modification, le loader de la route fournit les données à pré-remplir.
 *
 * Organisation :
 * - formulaires/FormulaireArticle.tsx : article, avec FormulaireNewsletter.tsx et FormulaireAlbum.tsx selon la catégorie ;
 * - formulaires/FormulairePage.tsx : page statique ;
 * - formulaires/CadreRedaction.tsx, ChampsCommuns.tsx, EditeurContenu.tsx : mise en page, champs et éditeur partagés ;
 * - fonctions/blog/useFormulaireRedaction.ts (+ useEditeurArticle, useImagesArticle) : état et logique communs ;
 * - fonctions/validationRedaction.ts et fonctions/blog/enregistrementRedaction.ts : validation et requêtes (fonctions pures).
 */

import type { TypeRedaction } from "../../fonctions/validationRedaction";
import FormulaireArticle from "./formulaires/FormulaireArticle";
import FormulairePage from "./formulaires/FormulairePage";

export default function RedactionArticle({ type = "nouvelArticle" }: { type?: TypeRedaction }) {
    return type == "nouvelArticle" ? <FormulaireArticle /> : <FormulairePage />;
}