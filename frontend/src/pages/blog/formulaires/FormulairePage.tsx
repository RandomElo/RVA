/**
 * Formulaire de création / modification d'une page statique (/administration/creation-page et /administration/modifier-page/:url).
 */

import { TriangleAlert } from "lucide-react";
import { useFormulaireRedaction } from "../../../fonctions/blog/useFormulaireRedaction";
import { requetePage, type ReponsePage } from "../../../fonctions/blog/enregistrementRedaction";
import type { ArticleFormValue } from "../../../constantes/types/blog";
import CadreRedaction from "./CadreRedaction";
import EditeurContenu from "./EditeurContenu";
import { BoutonPublier, ChampTitre, ChampUrl } from "./ChampsCommuns";

export default function FormulairePage() {
    const redaction = useFormulaireRedaction("nouvellePage");
    const { donneesLoader, valeur, setValeur, requete, notifier, navigation, enregistrer, finEnregistrement } = redaction;

    async function envoyerPage(page: ArticleFormValue) {
        const { url, corps } = requetePage(page, donneesLoader);

        const reponse = await requete<ReponsePage>({ url, methode: "POST", corps });
        if (!reponse) {
            finEnregistrement();
            return;
        }
        if (!reponse.page) {
            notifier({ type: "erreur", titre: "Erreur", description: reponse.detail });
        } else {
            notifier({ type: "succes", titre: "Succès", description: reponse.detail });
            navigation("/" + page.url);
        }
        finEnregistrement();
    }

    return (
        <CadreRedaction
            redaction={redaction}
            titre={donneesLoader ? "Modifier l'article" : "Crée une nouvelle page"}
            consigne="pour crée une nouvelle page"
            avertissement={
                <div className="flex items-center gap-4 mb-4">
                    <TriangleAlert size={30} className="shrink-0" color="red" />
                    <p className="text-sm">
                        La création de page est <span className="font-bold">réservée aux besoins spécifiques</span>. Pour un contenu classique, nous vous recommandons de créer <span className="font-bold">un article de blog</span>.
                    </p>
                </div>
            }
            onPublier={() => enregistrer("publie", envoyerPage)}
            onAnnuler={() => navigation("/administration/pages")}
            boutons={<BoutonPublier redaction={redaction} libelle="Enregistrer la page" />}
        >
            {/* Titre */}
            <ChampTitre redaction={redaction} />

            {/* Lien d'accès */}
            <ChampUrl redaction={redaction} prefixe="/" />

            {/* Affichage dans la navigation */}
            <div>
                <span className="mb-1.5 block text-sm font-medium text-[#040F33]">Visibilité dans le menu</span>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${valeur.dansNavigation === true ? "border-club-600 bg-club-50/50 ring-1 ring-club-600" : "border-club-200 hover:border-club-400"}`}>
                        <input type="radio" name="navigation" checked={valeur.dansNavigation === true} onChange={() => setValeur((v) => ({ ...v, dansNavigation: true }))} className="mt-0.5 h-4 w-4 text-club-600 focus:ring-club-500" />
                        <div>
                            <span className="block text-sm font-medium text-[#040F33]">Ajouter à la barre de navigation</span>
                            <span className="mt-0.5 block text-xs text-[#0B2270]/60">
                                La page apparaîtra dans le menu principal en haut du site. <span className="font-extrabold">Option non recommandée.</span>
                            </span>
                        </div>
                    </label>

                    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${valeur.dansNavigation === false ? "border-club-600 bg-club-50/50 ring-1 ring-club-600" : "border-club-200 hover:border-club-400"}`}>
                        <input type="radio" name="navigation" checked={valeur.dansNavigation === false} onChange={() => setValeur((v) => ({ ...v, dansNavigation: false }))} className="mt-0.5 h-4 w-4 text-club-600 focus:ring-club-500" />
                        <div>
                            <span className="block text-sm font-medium text-[#040F33]">Ne pas inclure dans la navigation</span>
                            <span className="mt-0.5 block text-xs text-[#0B2270]/60">Masquée du menu, mais toujours accessible via son lien direct.</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Éditeur de texte riche */}
            <EditeurContenu redaction={redaction} libelle="Contenu de la page" />
        </CadreRedaction>
    );
}
