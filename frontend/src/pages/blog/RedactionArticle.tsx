/**
 * Page back-office : rédaction / édition d'un article.
 * Couvre les 3 types de contenu du §3.4 : news publique, recommandation, news interne.
 *
 * Prérequis :
 * 1. npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image
 *          tiptap-markdown turndown marked
 * 2. lucide-react déjà installé (icônes toolbar + icônes de champ).
 * 3. Route suggérée : /administration/blog/nouveau (création) et /administration/blog/:id (édition,
 *    passer `article` en prop pour pré-remplir le formulaire).
 * 4. `onEnregistrer` doit appeler l'API (POST/PUT /api/articles) — non implémenté ici,
 *    seule la validation + la mise en forme du payload sont faites côté front.
 * 5. Le back-office est protégé par un middleware "administrateur" côté route parente,
 *    cette page ne refait pas ce contrôle.
 *
 * Modes d'édition :
 * `valeur.contenuHtml` est TOUJOURS la source de vérité (c'est elle qui est envoyée à l'API).
 * Les vues "markdown" et "html" sont des représentations dérivées, reconverties vers le HTML
 * canonique au moment où on change de mode (pas à chaque frappe, pour ne pas perdre le curseur
 * ni reformater le texte de l'utilisateur pendant qu'il tape).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Link as RouterLink } from "react-router-dom";
import { ImagePersonnalisee } from "../../fonctions/blog/ImagePersonnalisee";
import ModalRedimensionnerImage from "../../composants/modal/blog/ModalRedimensionnerImage";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, ImagePlus, Undo2, Redo2, Quote, Heading2, UploadCloud, X, Loader2, Eye, Code2, AlertCircle, TriangleAlert } from "lucide-react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useRequete } from "../../fonctions/requete";
import { useNotifications } from "../../contexts/NotificationsContext";
import { type ImageSite, type ArticleFormValue, type Categorie, type PhotoAlbum } from "../../constantes/types/blog";
import VisualisationCanva from "../../composants/blog/VisualisationCanva";
import { useAuth } from "../../contexts/AuthContext";
import ModalAjouterImage from "../../composants/modal/blog/ModalAjouterImage";
import Album from "../../composants/blog/Album";

type ModeEdition = "visuel" | "html";
type StatutArticle = "brouillon" | "publie";
type PropsModalRedimensionnement = {
    ouvert: boolean;
    pos: number | null;
    largeur: string;
}
const CATEGORIES: { value: Categorie; label: string; description: string }[] = [
    { value: "actu_publique", label: "Actu club", description: "Visible sur le site public (journée des assos, résultats de courses…)" },
    { value: "recommandation", label: "Recommandation", description: "Podcast, livre ou article conseillé - visible sur le site public" },
    { value: "actu_interne", label: "Actu interne", description: "Réservée aux membres connectés (CR de réunion, logistique…)" },
    { value: "solde", label: "Soldes", description: "Bon plan ou offre partenaire (matériel, inscription course…) by Kirsi Shop" },
    { value: "newsletter", label: "Newsletter", description: "Résumé périodique envoyé par e-mail aux membres" },
    { value: "album_photo", label: "Album photo", description: "Photos des événements et activités du club" },
    { value: "tuto", label: "Tutoriel", description: "Guides pratiques, démarches et conseils techniques" },
];

const VALEUR_INITIALE: ArticleFormValue = {
    titre: "",
    categorie: "actu_publique",
    url: "",
    imageUrl: "",
    urlCanva: '',
    contenuHtml: "",
    description: "",
    datePublication: new Date().toISOString().slice(0, 10),
    dansNavigation: false
};

export default function RedactionArticle({ type = "nouvelArticle" }: { type?: "nouvelArticle" | 'nouvellePage' }) {
    const donneesLoader = useLoaderData();
    const [valeur, setValeur] = useState<ArticleFormValue>(donneesLoader ?? VALEUR_INITIALE);
    const [erreurs, setErreurs] = useState<Partial<Record<keyof ArticleFormValue, string>>>({});
    const [erreurPresente, setErreurPresente] = useState<boolean>(false);
    const [enregistrementEnCours, setEnregistrementEnCours] = useState<StatutArticle | null>(null);
    const [mode, setMode] = useState<ModeEdition>("visuel");
    const [htmlTexte, setHtmlTexte] = useState("");
    const [ouvrirModalAjouterImage, setOuvrirModalAjouterImage] = useState<boolean>(false)
    const [ouvrirModalAjouterImageCouverture, setOuvrirModalAjouterImageCouverture] = useState<boolean | string>(false)

    const [images, setImages] = useState<ImageSite[]>([])
    const [modalImageRedim, setModalImageRedim] = useState<PropsModalRedimensionnement>({
        ouvert: false,
        pos: null,
        largeur: "100%",
    });
    const [photosAlbum, setPhotosAlbum] = useState<PhotoAlbum[] | null>(null)


    const navigation = useNavigate();
    const requete = useRequete();
    const { notifier } = useNotifications();
    const { role } = useAuth()

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-club-600 underline underline-offset-2" } }),
            ImagePersonnalisee.configure({ HTMLAttributes: { class: "rounded-lg transition-all cursor-pointer hover:ring-2 hover:ring-club-600" } }),
        ],
        content: valeur.contenuHtml || "<p></p>",
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose-base max-w-none min-h-[260px] px-4 py-3 focus:outline-none prose-headings:font-display prose-a:text-club-600",
            },
            // Détection du clic sur les images
            handleClick(view, _pos, event) {
                const cible = event.target as HTMLElement;

                // On vérifie si l'élément cliqué est bien une image dans l'éditeur
                if (cible.tagName === "IMG") {
                    // Retrouve le nœud ProseMirror exact sous le pointeur
                    const posImage = view.posAtDOM(cible, 0);
                    const noeud = view.state.doc.nodeAt(posImage);

                    if (noeud && noeud.type.name === "image") {
                        setModalImageRedim({
                            ouvert: true,
                            pos: posImage,
                            largeur: noeud.attrs.width || "100%",
                        });
                        return true; // Événement géré
                    }
                }
                return false;
            },
        },

        onUpdate: ({ editor }) => setValeur((v) => ({ ...v, contenuHtml: editor.getHTML() })),
    });

    const categoriePrecedenteRef = useRef<Categorie | undefined>(valeur?.categorie);

    const champ = useCallback(
        <K extends keyof ArticleFormValue>(cle: K) =>
            (val: ArticleFormValue[K]) => {
                setValeur((v) => ({ ...v, [cle]: val }));
                setErreurs((e) => ({ ...e, [cle]: undefined }));
            },
        [],
    );

    useEffect(() => {
        document.title = "Rédaction article - Running Vincennes Association";
        async function recuperationImages() {
            const reponse = await requete({ url: "/images/recuperer-galerie" })
            setImages(reponse)
        }
        recuperationImages()
    }, []);

    useEffect(() => {
        function gestionInitialisationNewsLetter() {
            const categoriePrecedente = categoriePrecedenteRef.current;
            categoriePrecedenteRef.current = valeur?.categorie;

            if (valeur?.categorie === "newsletter") {
                // On entre dans "newsletter" : on génère titre/url (cas normal, pas un reset).
            } else {
                // On ne reset titre/url QUE si on vient de quitter "newsletter".
                if (categoriePrecedente !== "newsletter") return;
                champ("titre")("");
                setValeur((v) => ({ ...v, url: "" }));
                return;
            }

            if (!valeur?.datePublication) return;

            const date = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" })
                .format(new Date(valeur.datePublication));
            const dateFormatee = date.charAt(0).toUpperCase() + date.slice(1);

            const titreGenere = "Newsletter " + dateFormatee;
            const urlGeneree = "newsletter-" + dateFormatee
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, "-");

            // Mise à jour sécurisée en vérifiant si le changement est vraiment nécessaire
            setValeur((v) => {
                if (v.titre === titreGenere && v.url === urlGeneree) return v; // Évite les re-renders inutiles
                return { ...v, titre: titreGenere, url: urlGeneree };
            });
        }
        gestionInitialisationNewsLetter()
    }, [valeur?.categorie, valeur?.datePublication]);

    /**
     * Change de mode d'édition en resynchronisant le contenu :
     * - en quittant "markdown" : reconvertit le markdown tapé en HTML canonique + éditeur visuel.
     * - en quittant "html" : le textarea HTML met déjà `valeur.contenuHtml` à jour à chaque frappe,
     *   donc on synchronise juste l'éditeur visuel avec cette valeur.
     * - en entrant dans "markdown" : recalcule le markdown à partir du HTML canonique actuel.
     */
    function changerMode(nouveauMode: ModeEdition) {
        if (nouveauMode === mode) return;

        let contenuHtmlAJour = valeur.contenuHtml;

        // 1. Quitter le mode précédent et récupérer le HTML mis à jour
        if (mode === "html") {
            contenuHtmlAJour = htmlTexte;
            setValeur((v) => ({ ...v, contenuHtml: contenuHtmlAJour }));
        }

        // 2. Préparer le nouveau mode
        if (nouveauMode === "html") {
            setHtmlTexte(contenuHtmlAJour || "");
        } else if (nouveauMode === "visuel" && editor) {
            editor.commands.setContent(contenuHtmlAJour || "<p></p>");
        }

        setMode(nouveauMode);
        setErreurs((e) => ({ ...e, contenuHtml: undefined }));
    }

    function gererChangementHtml(html: string) {
        setHtmlTexte(html);
        setErreurs((e) => ({ ...e, contenuHtml: undefined }));
    }

    function valider(): boolean {
        const nouvellesErreurs: typeof erreurs = {};
        const regex = /^(?!-)(?!.*--)[a-z0-9-]{6,}(?<!-)$/;

        if (!valeur.titre.trim()) {
            nouvellesErreurs.titre = "Le titre est obligatoire.";
            setErreurPresente(true);
        } else if (!regex.test(valeur.url.trim())) {
            nouvellesErreurs.url = "6 caractères minimum, lettres minuscules/chiffres/tirets, sans tirets consécutifs ni en bordure.";
            setErreurPresente(true);
        } else if (type == "nouvelArticle" && valeur.description.split(" ").length > 20) {
            nouvellesErreurs.description = "Description maximum de 20 mots.";
            setErreurPresente(true);
        } else {
            setErreurPresente(false);
        }

        // Le contenu "réel" dépend du mode actif : en markdown, valeur.contenuHtml n'est
        // reconverti qu'au changement de mode, donc on valide sur la bonne source ici.
        const contenuVide =
            mode === "html"
                ? !htmlTexte.trim()
                : !editor || editor.isEmpty;
        if (contenuVide && valeur.categorie !== "newsletter" && valeur.categorie !== "album_photo") {
            nouvellesErreurs.contenuHtml = "L'article ne peut pas être vide."
        };

        if (type == "nouvelArticle" && !valeur.datePublication) {
            nouvellesErreurs.datePublication = "Choisissez une date de publication.";
        }

        setErreurs(nouvellesErreurs);
        return Object.keys(nouvellesErreurs).length === 0;
    }

    async function gererEnregistrement(statut: StatutArticle) {
        // On resynchronise toujours le HTML canonique avec la vue active avant d'enregistrer,
        // sinon un contenu tapé en markdown/html juste avant "Publier" pourrait être perdu.
        const contenuFinal = mode === "html"
            ? htmlTexte // 👈 Utiliser htmlTexte
            : valeur.contenuHtml;
        const valeurFinale = { ...valeur, contenuHtml: contenuFinal };
        setValeur(valeurFinale);

        if (statut === "publie" && !valider()) return;
        setEnregistrementEnCours(statut);

        if (type == "nouvelArticle") {
            await onEnregistrerArticle(valeurFinale, statut);
        } else {
            onEnregistrerPage(valeurFinale)
        }

    }

    async function onEnregistrerArticle(article: ArticleFormValue, statut: StatutArticle) {
        let url = article.categorie == "newsletter" ? "/articles/cree-newsletter" : article.categorie == "album_photo" ? "/articles/cree-album" : "/articles/cree";
        let corps: { article: ArticleFormValue; statut: StatutArticle; id?: number; photosAlbum?: PhotoAlbum[] | null } = { article, statut };
        if (donneesLoader) {
            url = article.categorie == "newsletter" ? "/articles/modifier-newsletter" : article.categorie == "album_photo" ? "/articles/modifier-album" : "/articles/modifier";
            corps.id = donneesLoader.id;
        }

        if (role == "adherent") {
            url = "/articles/suggestion"
        }

        if (article.categorie == "album_photo") {
            corps = { ...corps, photosAlbum }
        }

        const reponse = await requete({ url, methode: "POST", corps });
        if (!reponse.article) {
            notifier({ type: "erreur", titre: "Erreur lors de l'enregistrement de l'article", description: reponse.detail });
        } else {
            notifier({ type: "succes", titre: "Succès", description: reponse.detail });
            const donnees = reponse.donnees;
            if (role == "adherent") return navigation("/blog")
            if (statut == "publie") {
                navigation("/" + donnees);
            } else {
                navigation("/blog");
            }
        }
        setEnregistrementEnCours(null);
    }

    async function onEnregistrerPage(article: ArticleFormValue) {
        const { contenuHtml, dansNavigation, titre, url } = article

        type CorpsPage = {
            contenuHtml: string;
            dansNavigation: boolean;
            titre: string;
            url: string;
            ancienneUrl?: string;
        };

        let corps: CorpsPage = { contenuHtml, dansNavigation, titre, url }
        if (donneesLoader) {
            corps = { ...corps, ancienneUrl: donneesLoader.url }
        }

        const reponse = await requete({ url: "/pages/" + (donneesLoader ? "modification" : "creation"), methode: "POST", corps })
        if (!reponse.page) {
            notifier({ type: "erreur", titre: "Erreur", description: reponse.detail });
        } else {
            notifier({ type: "succes", titre: "Succès", description: reponse.detail });
            navigation("/" + url)
        }
        setEnregistrementEnCours(null);

    }


    async function onAnnuler() {
        if (type == "nouvelArticle") {
            if (role == "administrateur") {
                navigation("/administration/blog")
            } else {
                navigation("/blog")

            }
        } else {
            navigation("/administration/pages")
        }
    }

    const ajouterImage = () => {
        if (!editor) return;
        setOuvrirModalAjouterImage(true)
        // const url = window.prompt("URL de l'image à insérer :", "https://");
        // if (url) editor.chain().focus().setImage({ src: url }).run();
    };
    return (
        <div className="mx-auto max-w-3xl px-6 py-10">
            <div className="mb-3">
                {role == "administrateur" ?
                    <RouterLink to="/administration" className="font-body text-sm text-club-600 hover:text-club-700">
                        ← Interface administration
                    </RouterLink> : ""}
            </div>

            <header className="mb-8">
                <h1 className="font-display text-2xl font-bold text-[#040F33] sm:text-3xl">{donneesLoader ? "Modifier l'article" : type == "nouvelArticle" ? "Rédiger un article" : "Crée une nouvelle page"}</h1>
                <p className="mt-1 text-sm text-[#0B2270]/70">Remplissez le formulaire ci-dessous, {type == "nouvelArticle" ? "puis enregistrez en brouillon ou publiez directement" : "pour crée une nouvelle page"}.</p>
            </header>
            {type == "nouvellePage" && <div className="flex items-center gap-4 mb-4">
                <TriangleAlert size={30} className="shrink-0" color="red" />
                <p className="text-sm">La création de page est <span className="font-bold">réservée aux besoins spécifiques</span>. Pour un contenu classique, nous vous recommandons de créer <span className="font-bold">un article de blog</span>.</p>
            </div>}
            <form
                className="flex flex-col gap-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    gererEnregistrement("publie");
                }}
            >
                {/* Titre */}
                <div>
                    <label htmlFor="titre" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                        Titre
                    </label>
                    <input id="titre" type="text" value={valeur.titre} disabled={valeur.categorie == "newsletter"} onChange={(e) => champ("titre")(e.target.value)} placeholder="Ex. : Retour sur le Téléthon 2026" className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${erreurs.titre ? "border-red-400" : "border-club-200"}`}
                    />
                    {erreurs.titre && <p className="mt-1 text-xs text-red-600">{erreurs.titre}</p>}
                </div>

                {/* Catégorie */}
                {type == "nouvelArticle" &&
                    <div>
                        <span className="mb-1.5 block text-sm font-medium text-[#040F33]">Catégorie</span>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {(role === "adherent"
                                ? CATEGORIES.filter((c) => c.value === "recommandation" || c.value === "actu_interne" || c.value === "solde")
                                : CATEGORIES
                            ).map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => champ("categorie")(cat.value)}
                                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition cursor-pointer ${valeur.categorie === cat.value ? "border-club-600 bg-club-50 text-club-800" : "border-club-200 text-[#040F33] hover:border-club-400"}`}
                                >
                                    <span className="block font-medium">{cat.label}</span>
                                    <span className="mt-0.5 block text-xs text-[#0B2270]/60">{cat.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                }

                {/* Lien d'accès */}
                <div>
                    <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                        Chemin d'accès
                    </label>

                    <input
                        id="url"
                        type="text"
                        disabled={valeur.categorie == "newsletter"}
                        value={valeur.url}
                        onChange={(e) => {
                            const nouvelleValeur = e.target.value;
                            setValeur((v) => ({ ...v, url: nouvelleValeur }));

                            const regex = /^(?!-)(?!.*--)[a-z0-9-]{6,}(?<!-)$/;
                            setErreurs((err) => ({
                                ...err,
                                url: nouvelleValeur && !regex.test(nouvelleValeur) ? "6 caractères minimum, lettres minuscules/chiffres/tirets, sans tirets consécutifs ni en bordure." : undefined,
                            }));
                        }}
                        placeholder="Ex. : telethon-2026"
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${erreurs.url ? "border-red-400" : "border-club-200"}`}
                    />

                    {valeur.url && <p className="mt-1.5 text-xs text-[#0B2270]/50">La page sera accessible par l'url : {"https://" + window.location.hostname + (type == "nouvelArticle" ? "/blog/" : "/") + valeur.url} .</p>}

                    {erreurs.url && <p className="mt-1 text-xs text-red-600">{erreurs.url}</p>}
                </div>

                {/* Type de référencement / Affichage Navigation */}
                {type == "nouvellePage" &&

                    <div>
                        <span className="mb-1.5 block text-sm font-medium text-[#040F33]">
                            Visibilité dans le menu
                        </span>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${valeur.dansNavigation === true
                                    ? "border-club-600 bg-club-50/50 ring-1 ring-club-600"
                                    : "border-club-200 hover:border-club-400"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="navigation"
                                    checked={valeur.dansNavigation === true}
                                    onChange={() => setValeur((v) => ({ ...v, dansNavigation: true }))}
                                    className="mt-0.5 h-4 w-4 text-club-600 focus:ring-club-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-[#040F33]">
                                        Ajouter à la barre de navigation
                                    </span>
                                    <span className="mt-0.5 block text-xs text-[#0B2270]/60">
                                        La page apparaîtra dans le menu principal en haut du site. <span className="font-extrabold">Option non recommandée.</span>
                                    </span>
                                </div>
                            </label>

                            <label
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${valeur.dansNavigation === false
                                    ? "border-club-600 bg-club-50/50 ring-1 ring-club-600"
                                    : "border-club-200 hover:border-club-400"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="navigation"
                                    checked={valeur.dansNavigation === false}
                                    onChange={() => setValeur((v) => ({ ...v, dansNavigation: false }))}
                                    className="mt-0.5 h-4 w-4 text-club-600 focus:ring-club-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-[#040F33]">
                                        Ne pas inclure dans la navigation
                                    </span>
                                    <span className="mt-0.5 block text-xs text-[#0B2270]/60">
                                        Masquée du menu, mais toujours accessible via son lien direct.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>
                }

                {valeur.categorie == "newsletter" ? <>
                    {/* URL Canvas */}
                    <div>
                        <label htmlFor="urlCanva" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                            URL Canvas
                        </label>

                        <input
                            id="urlCanva"
                            type="text"
                            value={valeur.urlCanva}
                            autoComplete="off"
                            onChange={(e) => {
                                const nouvelleValeur = e.target.value;
                                setValeur((v) => ({ ...v, urlCanva: nouvelleValeur }));

                                // const regex = /^(?!-)(?!.*--)[a-z0-9-]{6,}(?<!-)$/;
                                // setErreurs((err) => ({
                                //     ...err,
                                //     urlCanva: nouvelleValeur && !regex.test(nouvelleValeur) ? "6 caractères minimum, lettres minuscules/chiffres/tirets, sans tirets consécutifs ni en bordure." : undefined,
                                // }));
                            }}
                            placeholder="Ex. : https://canva.link/c7wayh13eoa9p9n"
                            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200`}
                        />
                        {valeur.urlCanva && <>
                            <p className={`my-2 mb-1.5 block text-sm font-medium text-[#040F33]`}
                            >Aperçu</p>
                            <VisualisationCanva url={valeur.urlCanva} setErreurs={setErreurs} />
                        </>}

                        {erreurs.urlCanva && <p className="mt-1 text-xs text-red-600">{erreurs.urlCanva}</p>}
                    </div>

                </> : <>
                    {/* Image de couverture */}
                    {type == "nouvelArticle" &&
                        <div>
                            <label htmlFor="image" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                                Image de couverture <span className="font-normal text-[#0B2270]/50">(optionnelle)</span>
                            </label>
                            {valeur.imageUrl ? (
                                <div className="relative overflow-hidden rounded-lg border border-club-200">
                                    <img
                                        src={valeur.imageUrl}
                                        alt="Aperçu de l'image de couverture"
                                        className="h-44 w-full object-cover"
                                        onError={() => setErreurs((e) => ({ ...e, imageUrl: "Ce lien ne pointe pas vers une image valide." }))}
                                        onLoad={() => setErreurs((e) => ({ ...e, imageUrl: undefined }))}
                                    />
                                    <button type="button" onClick={() => champ("imageUrl")("")} aria-label="Retirer l'image" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label htmlFor="image" className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-club-200 text-[#0B2270]/60 transition hover:border-club-400 hover:text-club-600" onClick={() => setOuvrirModalAjouterImageCouverture(true)}>
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
                        </div>}

                    {/* Description */}
                    {type == "nouvelArticle" &&
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
                                        description: nouvelleValeur && e.target.value.split(" ").length > 20 ? "Description maximum de 20 mots." : undefined,
                                    }));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") e.preventDefault();
                                }}
                                placeholder="Résumé court de l'article (max 20 mots), affiché dans les listes et aperçus…"
                                className={`w-full resize-y rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 ${erreurs.description ? "border-red-400" : "border-club-200"}`}
                            />
                            {erreurs.description && <p className="mt-1 text-xs text-red-600">{erreurs.description}</p>}
                        </div>}

                    {/* Éditeur de texte riche */}
                    {valeur.categorie == "album_photo" ?
                        <>
                            <p className="mb-1.5 block text-sm font-medium text-[#040F33]">
                                Album photo
                            </p>
                            <Album
                                images={photosAlbum}
                                onPhotosChange={(images: PhotoAlbum[]) => setPhotosAlbum(images)}
                                modeEdition={true}
                                imagesGalerie={images}
                            />
                        </>
                        :
                        <div>
                            <span className="mb-1.5 block text-sm font-medium text-[#040F33]">Contenu de{type == "nouvelArticle" ? " l'article" : " la page"}</span>
                            <div className={`overflow-hidden rounded-lg border bg-white ${erreurs.contenuHtml ? "border-red-400" : "border-club-200"}`}>
                                <Toolbar editor={editor} mode={mode} onChangerMode={changerMode} ajouterImage={ajouterImage} />

                                {mode === "visuel" && <EditorContent editor={editor} />}


                                {mode === "html" && <textarea value={htmlTexte}
                                    onChange={(e) => gererChangementHtml(e.target.value)}
                                    placeholder="<p>Mon paragraphe…</p>"
                                    spellCheck={false}
                                    className="min-h-[260px] w-full resize-y p-4 font-mono text-sm text-[#040F33] outline-none" />}
                            </div>
                            {erreurs.contenuHtml && <p className="mt-1 text-xs text-red-600">{erreurs.contenuHtml}</p>}
                            <p className="mt-1.5 text-xs text-[#0B2270]/50">Le mode HTML est destiné aux utilisateurs à l'aise avec ces formats, le mode Visuel (par défaut) reste le plus simple.</p>
                        </div>}


                </>}

                {/* Date de publication */}
                {type == "nouvelArticle" &&

                    <div className="max-w-xs">
                        <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-[#040F33]">
                            Date de publication
                        </label>
                        <input id="date" type="date" value={valeur.datePublication?.slice(0, 10) ?? ""} onChange={(e) => champ("datePublication")(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#040F33] outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200 ${erreurs.datePublication ? "border-red-400" : "border-club-200"}`} />
                        {erreurs.datePublication && <p className="mt-1 text-xs text-red-600">{erreurs.datePublication}</p>}
                    </div>}

                {/* Actions */}
                <div className="border-t border-club-100 pb-4">
                    {valeur.categorie == "newsletter" &&
                        <div className="flex items-center justify-end gap-2">
                            <TriangleAlert size={25} className="shrink-0" color="red" />
                            <p className="text-sm text-right my-3">Les newsletters <span className="font-bold">ne sont pas modifiables</span>. Leur suppression est définitive, <span className="font-bold">vérifiez avant de continuer</span>.</p>
                        </div>}

                    {/* Erreurs */}
                    {erreurPresente && (
                        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 mt-2 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <p>Au moins une erreur empêche la publication de l'article. Vérifiez les champs signalés en rouge ci-dessus.</p>
                        </div>
                    )}
                    <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onAnnuler} className="rounded-lg border border-club-200 px-5 py-2.5 text-sm font-medium text-[#0B2270] transition hover:bg-club-50 cursor-pointer">
                            Annuler
                        </button>
                        {type == "nouvelArticle" ? role == "administrateur" ?
                            <>
                                {!donneesLoader && (
                                    <button type="button" disabled={enregistrementEnCours !== null} onClick={() => gererEnregistrement("brouillon")} className="flex items-center justify-center gap-2 rounded-lg border border-club-600 px-5 py-2.5 text-sm font-medium text-club-600 transition hover:bg-club-50 disabled:opacity-60 cursor-pointer">
                                        {enregistrementEnCours === "brouillon" && <Loader2 size={16} className="animate-spin" />}
                                        Enregistrer en brouillon
                                    </button>
                                )}
                                <button type="submit" disabled={enregistrementEnCours !== null} className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ">
                                    {enregistrementEnCours === "publie" && <Loader2 size={16} className="animate-spin" />}
                                    Publier l'article
                                </button>
                            </> :

                            <button type="submit" disabled={enregistrementEnCours !== null} className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ">
                                {enregistrementEnCours === "publie" && <Loader2 size={16} className="animate-spin" />}
                                Proposer l'article
                            </button> :
                            <button type="submit" disabled={enregistrementEnCours !== null} className="flex items-center justify-center gap-2 rounded-lg bg-club-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0B2270] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ">
                                {enregistrementEnCours === "publie" && <Loader2 size={16} className="animate-spin" />}
                                Enregistrer la page
                            </button>
                        }
                    </div>
                </div>
            </form>

            <ModalAjouterImage
                ouvert={ouvrirModalAjouterImage}
                onFermer={() => setOuvrirModalAjouterImage(false)}
                editor={editor}
                images={images}
                setImages={setImages}
                type="galerieEtNouvelleImage"
            />

            <ModalAjouterImage
                ouvert={typeof ouvrirModalAjouterImageCouverture == "boolean" && ouvrirModalAjouterImageCouverture}
                onFermer={() => setOuvrirModalAjouterImageCouverture(false)}
                type="galerieEtNouvelleImage"
                images={images}
                setImages={setImages}
                onImageSelectionnee={(url) => champ("imageUrl")(url)}
            />

            {/* Nouvelle modale de redimensionnement d'image */}
            <ModalRedimensionnerImage
                editor={editor}
                ouvert={modalImageRedim.ouvert}
                pos={modalImageRedim.pos}
                largeurActuelle={modalImageRedim.largeur}
                onFermer={() => setModalImageRedim((prev) => ({ ...prev, ouvert: false }))}
            />
        </div>
    );
}

function Toolbar({
    editor,
    mode,
    onChangerMode,
    ajouterImage,
}: {
    editor: Editor | null;
    mode: ModeEdition;
    onChangerMode: (mode: ModeEdition) => void;
    ajouterImage: () => void;
}) {
    const ajouterLien = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes("link").href;
        const url = window.prompt("URL du lien :", previousUrl || "https://");

        // Si l'utilisateur annule
        if (url === null) return;

        // Si le champ est vidé, on retire le lien
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }

        // Sinon on applique le lien
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    };

    const boutonsFormatage: {
        label: string;
        icone: typeof Bold;
        actif?: boolean;
        action: () => void;
    }[] = editor
            ? [
                {
                    label: "Titre",
                    icone: Heading2,
                    actif: editor.isActive("heading", { level: 2 }),
                    action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                },
                {
                    label: "Gras",
                    icone: Bold,
                    actif: editor.isActive("bold"),
                    action: () => editor.chain().focus().toggleBold().run(),
                },
                {
                    label: "Italique",
                    icone: Italic,
                    actif: editor.isActive("italic"),
                    action: () => editor.chain().focus().toggleItalic().run(),
                },
                {
                    label: "Citation",
                    icone: Quote,
                    actif: editor.isActive("blockquote"),
                    action: () => editor.chain().focus().toggleBlockquote().run(),
                },
                {
                    label: "Liste à puces",
                    icone: List,
                    actif: editor.isActive("bulletList"),
                    action: () => editor.chain().focus().toggleBulletList().run(),
                },
                {
                    label: "Liste numérotée",
                    icone: ListOrdered,
                    actif: editor.isActive("orderedList"),
                    action: () => editor.chain().focus().toggleOrderedList().run(),
                },
                {
                    label: "Lien",
                    icone: LinkIcon,
                    actif: editor.isActive("link"),
                    action: ajouterLien,
                },
                {
                    label: "Image",
                    icone: ImagePlus,
                    action: ajouterImage
                },
            ]
            : [];

    const modes: { value: ModeEdition; label: string; icone: typeof Eye }[] = [
        { value: "visuel", label: "Visuel", icone: Eye },
        { value: "html", label: "HTML", icone: Code2 },
    ];

    return (
        /* 
           CORRECTION : 
           - 'min-h-[45px]' et 'h-auto' au lieu de 'h-[45px]' pour éviter le débordement.
           - 'w-full' pour forcer l'alignement sur toute la largeur du bandeau.
           - 'shrink-0' sur les boutons de mode pour éviter qu'ils se réduisent ou sautent.
        */
        <div className="flex min-h-[45px] w-full flex-wrap items-center justify-between gap-2 border-b border-club-100 bg-club-50 px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-1">
                {mode === "visuel" && (
                    <>
                        {boutonsFormatage.map(({ label, icone: Icone, actif, action }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={action}
                                aria-label={label}
                                title={label}
                                className={`flex h-8 w-8 items-center justify-center rounded-md transition ${actif
                                    ? "bg-club-600 text-white"
                                    : "text-[#0B2270] hover:bg-club-200/60"
                                    }`}
                            >
                                <Icone size={16} />
                            </button>
                        ))}
                        <span className="mx-1 h-5 w-px bg-club-200" />
                        <button
                            type="button"
                            onClick={() => editor?.chain().focus().undo().run()}
                            aria-label="Annuler"
                            title="Annuler"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-[#0B2270] transition hover:bg-club-200/60"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor?.chain().focus().redo().run()}
                            aria-label="Rétablir"
                            title="Rétablir"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-[#0B2270] transition hover:bg-club-200/60"
                        >
                            <Redo2 size={16} />
                        </button>
                    </>
                )}
            </div>

            {/* Sélecteur de mode verrouillé à droite sans décalage */}
            <div className="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-white p-0.5 border border-club-100">
                {modes.map(({ value, label, icone: Icone }) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => onChangerMode(value)}
                        title={label}
                        className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${mode === value
                            ? "bg-club-600 text-white"
                            : "text-[#0B2270] hover:bg-club-100"
                            }`}
                    >
                        <Icone size={13} />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}