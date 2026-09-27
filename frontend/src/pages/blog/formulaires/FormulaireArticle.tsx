/**
 * Formulaire de rédaction / modification d'un article de blog (/rediger-article et /administration/modifier-article/:url).
 * Les catégories "newsletter" et "album photo" remplacent l'éditeur de contenu par leurs propres champs
 * (FormulaireNewsletter, FormulaireAlbum) et ont leurs propres routes d'enregistrement.
 */

import { useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import type { ArticleFormValue, Categorie, PhotoAlbum } from "../../../constantes/types/blog";
import { useFormulaireRedaction } from "../../../fonctions/blog/useFormulaireRedaction";
import { useTitreNewsletter } from "../../../fonctions/blog/useTitreNewsletter";
import { destinationApresArticle, requeteArticle, type ReponseArticle, type StatutArticle } from "../../../fonctions/blog/enregistrementRedaction";
import { descriptionTropLongue, MESSAGE_DESCRIPTION } from "../../../fonctions/validationRedaction";
import CadreRedaction from "./CadreRedaction";
import EditeurContenu from "./EditeurContenu";
import { BoutonPublier, ChampTitre, ChampUrl } from "./ChampsCommuns";
import FormulaireNewsletter, { AvertissementNewsletter } from "./FormulaireNewsletter";
import FormulaireAlbum from "./FormulaireAlbum";

const CATEGORIES: { value: Categorie; label: string; description: string }[] = [
    { value: "actu_publique", label: "Actu club", description: "Visible sur le site public (journée des assos, résultats de courses…)" },
    { value: "recommandation", label: "Recommandation", description: "Podcast, livre ou article conseillé - visible sur le site public" },
    { value: "actu_interne", label: "Actu interne", description: "Réservée aux membres connectés (CR de réunion, logistique…)" },
    { value: "solde", label: "Soldes", description: "Bon plan ou offre partenaire (matériel, inscription course…) by Kirsi Shop" },
    { value: "newsletter", label: "Newsletter", description: "Résumé périodique envoyé par e-mail aux membres" },
    { value: "album_photo", label: "Album photo", description: "Photos des événements et activités du club" },
    { value: "tuto", label: "Tutoriel", description: "Guides pratiques, démarches et conseils techniques" },
];

export default function FormulaireArticle() {
    const redaction = useFormulaireRedaction("nouvelArticle");
    const { donneesLoader, valeur, setValeur, erreurs, setErreurs, champ, images, role, requete, notifier, navigation, enregistrer, finEnregistrement, enregistrementEnCours } = redaction;
    const [photosAlbum, setPhotosAlbum] = useState<PhotoAlbum[] | null>(null);

    useTitreNewsletter(valeur, setValeur, champ);

    async function envoyerArticle(article: ArticleFormValue, statut: StatutArticle) {
        const { url, corps } = requeteArticle(article, statut, { articleExistant: donneesLoader, role, photosAlbum });

        const reponse = await requete<ReponseArticle>({ url, methode: "POST", corps });
        if (!reponse) {
            finEnregistrement();
            return;
        }
        if (!reponse.article) {
            notifier({ type: "erreur", titre: "Erreur lors de l'enregistrement de l'article", description: reponse.detail });
        } else {
            notifier({ type: "succes", titre: "Succès", description: reponse.detail });
            navigation(destinationApresArticle(role, statut, reponse.donnees));
            // Un adhérent quitte la page sans repasser par la fin d'enregistrement.
            if (role == "adherent") return;
        }
        finEnregistrement();
    }

    return (
        <CadreRedaction
            redaction={redaction}
            titre={donneesLoader ? "Modifier l'article" : "Rédiger un article"}
            consigne="puis enregistrez en brouillon ou publiez directement"
            avertissementActions={valeur.categorie == "newsletter" && <AvertissementNewsletter />}
            onPublier={() => enregistrer("publie", envoyerArticle)}
            onAnnuler={() => navigation(role == "administrateur" ? "/administration/blog" : "/blog")}
            boutons={
                role == "administrateur" ? (
                    <>
                        {!donneesLoader && (
                            <button type="button" disabled={enregistrementEnCours !== null} onClick={() => enregistrer("brouillon", envoyerArticle)} className="flex items-center justify-center gap-2 rounded-lg border border-club-600 px-5 py-2.5 text-sm font-medium text-club-600 transition hover:bg-club-50 disabled:opacity-60 cursor-pointer">
                                {enregistrementEnCours === "brouillon" && <Loader2 size={16} className="animate-spin" />}
                                Enregistrer en brouillon
                            </button>
                        )}
                        <BoutonPublier redaction={redaction} libelle="Publier l'article" />
                    </>
                ) : (
                    <BoutonPublier redaction={redaction} libelle="Proposer l'article" />
                )
            }
        >
            {/* Titre */}
            <ChampTitre redaction={redaction} />

            {/* Catégorie */}
            <div>
                <span className="mb-1.5 block text-sm font-medium text-[#040F33]">Catégorie</span>
                <div className="grid gap-2 sm:grid-cols-3">
                    {(role === "adherent" ? CATEGORIES.filter((c) => c.value === "recommandation" || c.value === "actu_interne" || c.value === "solde") : CATEGORIES).map((cat) => (
                        <button key={cat.value} type="button" onClick={() => champ("categorie")(cat.value)} className={`rounded-lg border px-3 py-2.5 text-left text-sm transition cursor-pointer ${valeur.categorie === cat.value ? "border-club-600 bg-club-50 text-club-800" : "border-club-200 text-[#040F33] hover:border-club-400"}`}>
                            <span className="block font-medium">{cat.label}</span>
                            <span className="mt-0.5 block text-xs text-[#0B2270]/60">{cat.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Lien d'accès */}
            <ChampUrl redaction={redaction} prefixe="/blog/" />

            {valeur.categorie == "newsletter" ? (
                <FormulaireNewsletter redaction={redaction} />
            ) : (
                <>
                    {/* Image de couverture */}
                    <div>
                        <label htmlFor="image" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                            Image de couverture <span className="font-normal text-[#0B2270]/50">(optionnelle)</span>
                        </label>
                        {valeur.imageUrl ? (
                            <div className="relative overflow-hidden rounded-lg border border-club-200">
                                <img src={valeur.imageUrl} alt="Aperçu de l'image de couverture" className="h-44 w-full object-cover" onError={() => setErreurs((e) => ({ ...e, imageUrl: "Ce lien ne pointe pas vers une image valide." }))} onLoad={() => setErreurs((e) => ({ ...e, imageUrl: undefined }))} />
                                <button type="button" onClick={() => champ("imageUrl")("")} aria-label="Retirer l'image" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <label htmlFor="image" className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-club-200 text-[#0B2270]/60 transition hover:border-club-400 hover:text-club-600" onClick={() => images.setModalCouvertureOuverte(true)}>
                                <UploadCloud size={22} />
                                <span className="text-xs">Coller une URL d'image ou en séléctionner une</span>
                                <span className="text-xs">⚠️ Format paysage recommandé (16:9)</span>
                            </label>
                        )}
                        <input
                            id="image"
                            type="text"
                            value={valeur.imageUrl}
                            onChange={(e) => {
                                const nouvelleValeur = e.target.value;
                                setValeur((v) => ({ ...v, imageUrl: nouvelleValeur }));

                                if (!nouvelleValeur) {
                                    setErreurs((err) => ({ ...err, imageUrl: undefined }));
                                    return;
                                }

                                const formatValide = /^(https?:\/\/|\/)\S+$/i.test(nouvelleValeur.trim());
                                setErreurs((err) => ({
                                    ...err,
                                    imageUrl: formatValide ? undefined : "Saisissez un lien absolu (https://…) ou un chemin du site (/…).",
                                }));
                            }}
                            placeholder="https://… ou /images/i/…"
                            className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 ${erreurs.imageUrl ? "border-red-400" : "border-club-200"}`}
                        />
                        {erreurs.imageUrl && <p className="mt-1 text-xs text-red-600">{erreurs.imageUrl}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                            Description <span className="font-normal text-[#0B2270]/50">(fortement recommandé)</span>
                        </label>
                        <textarea
                            id="description"
                            rows={3}
                            value={valeur.description}
                            onChange={(e) => {
                                const nouvelleValeur = e.target.value;
                                setValeur((v) => ({ ...v, description: nouvelleValeur }));

                                setErreurs((err) => ({
                                    ...err,
                                    description: nouvelleValeur && descriptionTropLongue(nouvelleValeur) ? MESSAGE_DESCRIPTION : undefined,
                                }));
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") e.preventDefault();
                            }}
                            placeholder="Résumé court de l'article (max 20 mots), affiché dans les listes et aperçus…"
                            className={`w-full resize-y rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 ${erreurs.description ? "border-red-400" : "border-club-200"}`}
                        />
                        {erreurs.description && <p className="mt-1 text-xs text-red-600">{erreurs.description}</p>}
                    </div>

                    {/* Éditeur de texte riche, ou album photo */}
                    {valeur.categorie == "album_photo" ? <FormulaireAlbum photosAlbum={photosAlbum} setPhotosAlbum={setPhotosAlbum} imagesGalerie={images.images} /> : <EditeurContenu redaction={redaction} libelle="Contenu de l'article" />}
                </>
            )}

            {/* Date de publication */}
            <div className="max-w-xs">
                <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                    Date de publication
                </label>
                <input id="date" type="date" value={valeur.datePublication?.slice(0, 10) ?? ""} onChange={(e) => champ("datePublication")(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 ${erreurs.datePublication ? "border-red-400" : "border-club-200"}`} />
                {erreurs.datePublication && <p className="mt-1 text-xs text-red-600">{erreurs.datePublication}</p>}
            </div>
        </CadreRedaction>
    );
}
