/**
 * Bloc "Contenu" des formulaires de rédaction : barre d'outils, éditeur visuel (Tiptap) ou textarea HTML.
 */

import { EditorContent, type Editor } from "@tiptap/react";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, ImagePlus, Undo2, Redo2, Quote, Heading2, Eye, Code2 } from "lucide-react";
import type { ModeEdition } from "../../../fonctions/blog/useEditeurArticle";
import type { FormulaireRedaction } from "../../../fonctions/blog/useFormulaireRedaction";

export default function EditeurContenu({ redaction, libelle }: { redaction: FormulaireRedaction; libelle: string }) {
    const { editeur, erreurs, images } = redaction;
    const { editor, mode, htmlTexte, changerMode, gererChangementHtml } = editeur;

    const ajouterImage = () => {
        if (!editor) return;
        images.setModalImageOuverte(true);
    };

    return (
        <div>
            <span className="mb-1.5 block text-sm font-medium text-[#040F33]">{libelle}</span>
            <div className={`overflow-hidden rounded-lg border bg-white ${erreurs.contenuHtml ? "border-red-400" : "border-club-200"}`}>
                <Toolbar editor={editor} mode={mode} onChangerMode={changerMode} ajouterImage={ajouterImage} />

                {mode === "visuel" && <EditorContent editor={editor} />}

                {mode === "html" && <textarea value={htmlTexte} onChange={(e) => gererChangementHtml(e.target.value)} placeholder="<p>Mon paragraphe…</p>" spellCheck={false} className="min-h-[260px] w-full resize-y p-4 font-mono text-sm text-[#040F33] outline-none" />}
            </div>
            {erreurs.contenuHtml && <p className="mt-1 text-xs text-red-600">{erreurs.contenuHtml}</p>}
            <p className="mt-1.5 text-xs text-[#0B2270]/50">Le mode HTML est destiné aux utilisateurs à l'aise avec ces formats, le mode Visuel (par défaut) reste le plus simple.</p>
        </div>
    );
}

function Toolbar({ editor, mode, onChangerMode, ajouterImage }: { editor: Editor | null; mode: ModeEdition; onChangerMode: (mode: ModeEdition) => void; ajouterImage: () => void }) {
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
                  action: ajouterImage,
              },
          ]
        : [];

    const modes: { value: ModeEdition; label: string; icone: typeof Eye }[] = [
        { value: "visuel", label: "Visuel", icone: Eye },
        { value: "html", label: "HTML", icone: Code2 },
    ];

    return (
        // 'min-h-[45px]' + 'flex-wrap' évitent le débordement, 'w-full' aligne sur toute la largeur du bandeau,
        // 'shrink-0' empêche les boutons de mode de se réduire ou de sauter à la ligne.
        <div className="flex min-h-[45px] w-full flex-wrap items-center justify-between gap-2 border-b border-club-100 bg-club-50 px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-1">
                {mode === "visuel" && (
                    <>
                        {boutonsFormatage.map(({ label, icone: Icone, actif, action }) => (
                            <button key={label} type="button" onClick={action} aria-label={label} title={label} className={`flex h-8 w-8 items-center justify-center rounded-md transition ${actif ? "bg-club-600 text-white" : "text-[#0B2270] hover:bg-club-200/60"}`}>
                                <Icone size={16} />
                            </button>
                        ))}
                        <span className="mx-1 h-5 w-px bg-club-200" />
                        <button type="button" onClick={() => editor?.chain().focus().undo().run()} aria-label="Annuler" title="Annuler" className="flex h-8 w-8 items-center justify-center rounded-md text-[#0B2270] transition hover:bg-club-200/60">
                            <Undo2 size={16} />
                        </button>
                        <button type="button" onClick={() => editor?.chain().focus().redo().run()} aria-label="Rétablir" title="Rétablir" className="flex h-8 w-8 items-center justify-center rounded-md text-[#0B2270] transition hover:bg-club-200/60">
                            <Redo2 size={16} />
                        </button>
                    </>
                )}
            </div>

            {/* Sélecteur de mode verrouillé à droite sans décalage */}
            <div className="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-white p-0.5 border border-club-100">
                {modes.map(({ value, label, icone: Icone }) => (
                    <button key={value} type="button" onClick={() => onChangerMode(value)} title={label} className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${mode === value ? "bg-club-600 text-white" : "text-[#0B2270] hover:bg-club-100"}`}>
                        <Icone size={13} />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
