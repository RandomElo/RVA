/**
 * Éditeur de contenu du formulaire de rédaction (Tiptap) et ses deux modes d'édition.
 *
 * `contenuHtml` (dans l'état du formulaire) est TOUJOURS la source de vérité : c'est lui qui est envoyé à l'API.
 * La vue "html" est une représentation dérivée, reconvertie vers le HTML canonique au moment où on change de mode
 * (pas à chaque frappe, pour ne pas perdre le curseur ni reformater le texte de l'utilisateur pendant qu'il tape).
 */

import { useState, type Dispatch, type SetStateAction } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { ImagePersonnalisee } from "./ImagePersonnalisee";
import type { ArticleFormValue } from "../../constantes/types/blog";
import type { ErreursRedaction } from "../validationRedaction";

export type ModeEdition = "visuel" | "html";

export type ModalRedimensionnement = {
    ouvert: boolean;
    pos: number | null;
    largeur: string;
};

type Options = {
    /** Contenu HTML courant du formulaire. */
    contenuHtml: string;
    setValeur: Dispatch<SetStateAction<ArticleFormValue>>;
    setErreurs: Dispatch<SetStateAction<ErreursRedaction>>;
};

export function useEditeurArticle({ contenuHtml, setValeur, setErreurs }: Options) {
    const [mode, setMode] = useState<ModeEdition>("visuel");
    const [htmlTexte, setHtmlTexte] = useState("");
    const [modalImageRedim, setModalImageRedim] = useState<ModalRedimensionnement>({
        ouvert: false,
        pos: null,
        largeur: "100%",
    });

    const editor = useEditor({
        extensions: [StarterKit, Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-club-600 underline underline-offset-2" } }), ImagePersonnalisee.configure({ HTMLAttributes: { class: "rounded-lg transition-all cursor-pointer hover:ring-2 hover:ring-club-600" } })],
        content: contenuHtml || "<p></p>",
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

    /**
     * Change de mode d'édition en resynchronisant le contenu :
     * - en quittant "html" : le HTML tapé devient le contenu canonique du formulaire ;
     * - en entrant dans "html" : le textarea reprend le HTML canonique actuel ;
     * - en entrant dans "visuel" : l'éditeur visuel est resynchronisé avec le HTML canonique.
     */
    function changerMode(nouveauMode: ModeEdition) {
        if (nouveauMode === mode) return;

        let contenuHtmlAJour = contenuHtml;

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

    /** Le contenu "réel" dépend du mode actif : en mode html, `contenuHtml` n'est mis à jour qu'au changement de mode. */
    function estContenuVide(): boolean {
        return mode === "html" ? !htmlTexte.trim() : !editor || editor.isEmpty;
    }

    /** HTML à enregistrer, resynchronisé avec la vue active (un contenu tapé en mode html juste avant l'envoi n'est pas perdu). */
    function contenuFinal(): string {
        return mode === "html" ? htmlTexte : contenuHtml;
    }

    function fermerModalImageRedim() {
        setModalImageRedim((prev) => ({ ...prev, ouvert: false }));
    }

    return { editor, mode, htmlTexte, changerMode, gererChangementHtml, estContenuVide, contenuFinal, modalImageRedim, fermerModalImageRedim };
}

export type EditeurArticle = ReturnType<typeof useEditeurArticle>;
