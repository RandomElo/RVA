/**
 * Modale d'envoi d'un mail groupé aux adhérents.
 */

import { useRef, useState } from "react";
import { Loader2, Paperclip, Link as LinkIcon, X, Send, FileText, Image as ImageIcon, Plus, AlertTriangle } from "lucide-react";
import Modal from "../Modal";
import { useRequete } from "../../../fonctions/requete";

interface Props {
    ouvert: boolean;
    onFermer: () => void;
    nombreDestinataires?: number;
}

type Lien = {
    id: string;
    libelle: string;
    url: string;
};

const TYPES_ACCEPTES = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const TAILLE_MAX_FICHIER = 10 * 1024 * 1024; // 10 Mo
const NOMBRE_MAX_FICHIERS = 10;

export default function ModalMailAdherents({ ouvert, onFermer, nombreDestinataires }: Props) {
    const [sujet, setSujet] = useState("");
    const [corps, setCorps] = useState("");
    const [piecesJointes, setPiecesJointes] = useState<File[]>([]);
    const [liens, setLiens] = useState<Lien[]>([]);
    const [libelleLien, setLibelleLien] = useState("");
    const [urlLien, setUrlLien] = useState("");

    const [erreur, setErreur] = useState<string | null>(null);
    const [erreurFichier, setErreurFichier] = useState<string | null>(null);
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [survole, setSurvole] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const requete = useRequete();

    function reinitialiser() {
        setSujet("");
        setCorps("");
        setPiecesJointes([]);
        setLiens([]);
        setLibelleLien("");
        setUrlLien("");
        setErreur(null);
        setErreurFichier(null);
        setEnvoiEnCours(false);
        setSurvole(false);
    }

    function fermer() {
        reinitialiser();
        onFermer();
    }

    function ajouterFichiers(fichiers: FileList | File[] | null) {
        if (!fichiers) return;
        setErreurFichier(null);

        const liste = Array.from(fichiers);
        const valides: File[] = [];

        for (const f of liste) {
            if (piecesJointes.length + valides.length >= NOMBRE_MAX_FICHIERS) {
                setErreurFichier(`Vous ne pouvez pas joindre plus de ${NOMBRE_MAX_FICHIERS} fichiers.`);
                break;
            }

            const extension = "." + f.name.split(".").pop()?.toLowerCase();
            if (!TYPES_ACCEPTES.includes(extension)) {
                setErreurFichier(`"${f.name}" n'est pas un format accepté (pdf, png, jpg, jpeg, webp).`);
                continue;
            }
            if (f.size > TAILLE_MAX_FICHIER) {
                setErreurFichier(`"${f.name}" dépasse la taille maximale de 10 Mo.`);
                continue;
            }
            valides.push(f);
        }

        if (valides.length > 0) {
            setPiecesJointes((prec) => [...prec, ...valides]);
        }
    }

    function retirerFichier(index: number) {
        setPiecesJointes((prec) => prec.filter((_, i) => i !== index));
    }

    function onDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setSurvole(false);
        ajouterFichiers(e.dataTransfer.files);
    }

    function ajouterLien() {
        if (!libelleLien.trim() || !urlLien.trim()) {
            setErreur("Merci de renseigner un libellé et une URL pour le lien.");
            return;
        }

        let urlFinale = urlLien.trim();
        if (!/^https?:\/\//i.test(urlFinale)) {
            urlFinale = "https://" + urlFinale;
        }

        try {
            new URL(urlFinale);
        } catch {
            setErreur("Cette URL n'a pas l'air valide.");
            return;
        }

        setErreur(null);
        setLiens((prec) => [...prec, { id: crypto.randomUUID(), libelle: libelleLien.trim(), url: urlFinale }]);
        setLibelleLien("");
        setUrlLien("");
    }

    function retirerLien(id: string) {
        setLiens((prec) => prec.filter((l) => l.id !== id));
    }

    async function envoyerMail() {
        if (!sujet.trim() || !corps.trim()) {
            setErreur("Merci de renseigner le sujet et le corps du mail.");
            return;
        }

        setErreur(null);
        setEnvoiEnCours(true);
        try {
            const formData = new FormData();
            formData.append("sujet", sujet.trim());
            formData.append("corps", corps.trim());
            formData.append("liens", JSON.stringify(liens.map(({ libelle, url }) => ({ libelle, url }))));
            piecesJointes.forEach((f) => formData.append("piecesJointes", f));

            const reponse = await requete({
                url: "/utilisateurs/envoyer-mail-adherents",
                methode: "POST",
                corps: formData,
                formData: true
            });

            if (reponse?.erreur) {
                setErreur(reponse.detail ?? "Le mail n'a pas pu être envoyé.");
                setEnvoiEnCours(false);
            } else {
                fermer();
            }
        } catch {
            setErreur("Le mail n'a pas pu être envoyé. Réessaie dans un instant.");
            setEnvoiEnCours(false);
        }
    }

    return (
        <Modal ouvert={ouvert} titre="Envoyer un mail aux adhérents" onFermer={fermer} largeurMax="md">
            <div className="flex flex-col gap-4">
                {typeof nombreDestinataires === "number" && (
                    <p className="text-sm text-club-900/70">
                        Ce mail sera envoyé à <span className="font-medium text-club-900">{nombreDestinataires} adhérent{nombreDestinataires > 1 ? "s" : ""}</span>.
                    </p>
                )}

                <div className="flex flex-col gap-1">
                    <label htmlFor="sujet" className="text-sm font-medium text-club-700">
                        Sujet
                    </label>
                    <input
                        id="sujet"
                        type="text"
                        value={sujet}
                        autoComplete="off"
                        onChange={(e) => setSujet(e.target.value)}
                        placeholder="Reprise des entraînements le 15 septembre"
                        className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="corps" className="text-sm font-medium text-club-700">
                        Corps du mail
                    </label>
                    <textarea
                        id="corps"
                        value={corps}
                        onChange={(e) => setCorps(e.target.value)}
                        placeholder="Bonjour à toutes et à tous,..."
                        rows={7}
                        className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                    />
                </div>

                {/* Liens */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-club-700">Liens</label>

                    {liens.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                            {liens.map((l) => (
                                <li key={l.id} className="flex items-center gap-2 rounded-lg border border-club-100 bg-club-50 px-3 py-1.5">
                                    <LinkIcon size={14} className="shrink-0 text-club-400" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-club-900">{l.libelle}</p>
                                        <p className="truncate text-xs text-club-600/70">{l.url}</p>
                                    </div>
                                    <button type="button" onClick={() => retirerLien(l.id)} aria-label="Retirer le lien" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-club-400 transition hover:bg-club-100 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={libelleLien}
                            autoComplete="off"
                            onChange={(e) => setLibelleLien(e.target.value)}
                            placeholder="Libellé (ex : Inscription)"
                            className="w-2/5 rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                        />
                        <input
                            type="text"
                            value={urlLien}
                            autoComplete="off"
                            onChange={(e) => setUrlLien(e.target.value)}
                            placeholder="https://…"
                            className="flex-1 rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200"
                        />
                        <button
                            type="button"
                            onClick={ajouterLien}
                            aria-label="Ajouter le lien"
                            title="Ajouter le lien"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-club-50 text-club-600 transition hover:bg-club-100"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Pièces jointes */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-club-700">Pièces jointes</label>

                    <input
                        ref={inputRef}
                        type="file"
                        accept={TYPES_ACCEPTES.join(",")}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            ajouterFichiers(e.target.files);
                            e.target.value = "";
                        }}
                    />

                    <div
                        onClick={() => piecesJointes.length < NOMBRE_MAX_FICHIERS && inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => piecesJointes.length < NOMBRE_MAX_FICHIERS && setSurvole(true)}
                        onDragLeave={() => setSurvole(false)}
                        onDrop={onDrop}
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 text-center transition ${piecesJointes.length >= NOMBRE_MAX_FICHIERS
                            ? "cursor-not-allowed border-club-100 bg-club-50/50 opacity-60"
                            : `cursor-pointer ${survole ? "border-club-500 bg-club-100" : "border-club-200 bg-club-50 hover:border-club-400"}`
                            }`}
                    >
                        <Paperclip size={22} className="text-club-300" />
                        <span className="text-sm font-medium text-club-600">
                            {piecesJointes.length >= NOMBRE_MAX_FICHIERS
                                ? `Limite de ${NOMBRE_MAX_FICHIERS} fichiers atteinte`
                                : "Cliquer ou glisser des fichiers ici (pdf, image)"}
                        </span>
                    </div>

                    {piecesJointes.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                            {piecesJointes.map((f, i) => (
                                <li key={i} className="flex items-center gap-2 rounded-lg border border-club-100 px-3 py-1.5">
                                    {f.type === "application/pdf" ? <FileText size={14} className="shrink-0 text-club-400" /> : <ImageIcon size={14} className="shrink-0 text-club-400" />}
                                    <span className="min-w-0 flex-1 truncate text-sm text-club-900">{f.name}</span>
                                    <span className="shrink-0 text-xs text-club-600/60">{(f.size / 1024 / 1024).toFixed(1)} Mo</span>
                                    <button type="button" onClick={() => retirerFichier(i)} aria-label="Retirer la pièce jointe" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-club-400 transition hover:bg-club-100 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {erreurFichier && (
                        <p className="flex items-center gap-1.5 text-sm text-amber-700">
                            <AlertTriangle size={14} />
                            {erreurFichier}
                        </p>
                    )}
                </div>

                {erreur && <p className="text-sm text-red-600">{erreur}</p>}

                <div className="mt-2 flex items-center justify-end gap-2">
                    <button type="button" onClick={fermer} className="rounded-lg px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={envoyerMail}
                        disabled={envoiEnCours}
                        className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-50"
                    >
                        {envoiEnCours ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Envoyer
                    </button>
                </div>
            </div>
        </Modal>
    );
}