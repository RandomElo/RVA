/**
 * Modale d'import en masse des photos des adhérents via un fichier ZIP.
 * Emplacement suggéré : src/composants/adherents/ModalZipPhotos.tsx
 *
 * Usage : déclenchée depuis un bouton global "Importer des photos (ZIP)"
 * dans le header de la page adhérents (pas depuis une ligne précise).
 *
 * Flux en une seule étape : le fichier ZIP est envoyé tel quel au back,
 * qui l'extrait, tente d'associer chaque photo à un adhérent via le nom
 * de fichier ("Prenom_Nom.jpg"), enregistre les photos correspondantes,
 * et renvoie la liste des adhérents à jour ainsi qu'un tableau d'erreurs
 * (fichiers ignorés : extension interdite, utilisateur inexistant, etc.).
 * Il n'y a plus d'étape de vérification/correction manuelle côté front.
 *
 * Prérequis :
 * 1. Adapter le chemin d'import de `Modal` et de `Adherent`.
 * 2. Endpoint : POST /utilisateurs/ajouter-photos-zip
 *    (multipart/form-data, champ "zip") → renvoie :
 *      { etat: boolean; detail: { donnees: Adherent[]; erreurs: string[] } }
 *    - donnees : la liste complète des adhérents à jour (photos incluses)
 *    - erreurs : une entrée par fichier non traité, du type
 *      "nom_fichier.jpg : utilisateur inexistant"
 * 3. L'extraction du ZIP n'est PAS faite côté front (pas de lib type JSZip
 *    ici) : le fichier est envoyé tel quel au back.
 */

import { useRef, useState } from "react";
import { FileArchive, Loader2, Upload, AlertTriangle } from "lucide-react";
import { useRequete } from "../../../fonctions/requete";
import Modal from "../Modal";
import type { Adherent } from "../../../constantes/types/adherents";

type ReponseImportZip = {
    donnees: Adherent[];
    erreurs: string[];
};

type Props = {
    ouvert: boolean;
    onFermer: () => void;
    setAdherents: React.Dispatch<React.SetStateAction<Adherent[] | null>>;
};

export default function ModalZipPhotos({ ouvert, onFermer, setAdherents }: Props) {
    const [fichierZip, setFichierZip] = useState<File | null>(null);
    const [enEnvoi, setEnEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const [erreursImport, setErreursImport] = useState<string[]>([]);
    const [survole, setSurvole] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const requete = useRequete();

    function reinitialiser() {
        setFichierZip(null);
        setEnEnvoi(false);
        setErreur(null);
        setErreursImport([]);
        setSurvole(false);
    }

    function fermer() {
        reinitialiser();
        onFermer();
    }

    function choisirFichier(f: File | null) {
        setErreur(null);
        setErreursImport([]);
        if (!f) {
            setFichierZip(null);
            return;
        }
        if (!f.name.toLowerCase().endsWith(".zip")) {
            setErreur("Le fichier doit être une archive .zip.");
            return;
        }
        setFichierZip(f);
    }

    function onDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setSurvole(false);
        choisirFichier(e.dataTransfer.files?.[0] ?? null);
    }

    async function handleImporter() {
        if (!fichierZip) return;
        setEnEnvoi(true);
        setErreur(null);
        setErreursImport([]);
        try {
            const formData = new FormData();
            formData.append("zip", fichierZip);

            const reponse: ReponseImportZip = await requete({
                url: "/utilisateurs/ajouter-photos-zip",
                methode: "POST",
                corps: formData,
                formData: true
            });

            setAdherents(reponse.donnees);

            if (reponse.erreurs.length > 0) {
                // On garde la modale ouverte pour montrer les fichiers non traités,
                // les adhérents mis à jour ont déjà été appliqués.
                setErreursImport(reponse.erreurs);
                setFichierZip(null);
            } else {
                fermer();
            }
        } catch {
            setErreur("Impossible d'importer le fichier. Vérifiez qu'il s'agit bien d'un .zip valide.");
        } finally {
            setEnEnvoi(false);
        }
    }

    return (
        <Modal ouvert={ouvert} titre="Importer un dossier de photos" onFermer={fermer}>
            <p className="text-sm text-club-900/70">Déposez une archive .zip contenant une photo par adhérent. Nommez chaque fichier "Prenom_Nom.jpg" (ex. "Camille_Dupont.jpg"). Le nom et le prénom doivent correspondre exactement au compte créé.</p>

            <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)} />

            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setSurvole(true)}
                onDragLeave={() => setSurvole(false)}
                onDrop={onDrop}
                className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition ${survole ? "border-club-500 bg-club-100" : "border-club-200 bg-club-50 hover:border-club-400"}`}
            >
                <FileArchive size={26} className="text-club-300" />
                {fichierZip ? <span className="text-sm font-medium text-club-700">{fichierZip.name}</span> : <span className="text-sm font-medium text-club-600">Cliquer ou glisser un fichier .zip ici</span>}
            </div>

            {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

            {erreursImport.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                        <AlertTriangle size={16} />
                        {erreursImport.length} fichier(s) non importé(s)
                    </p>
                    <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-amber-800">
                        {erreursImport.map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-amber-700/80">Les autres photos ont bien été importées. Vous pouvez déposer un nouveau fichier corrigé ci-dessus, ou fermer cette fenêtre.</p>
                </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={fermer} className="rounded-lg border border-club-200 px-4 py-2.5 text-sm font-medium text-club-700 transition hover:bg-club-50">
                    {erreursImport.length > 0 ? "Fermer" : "Annuler"}
                </button>
                <button
                    type="button"
                    onClick={handleImporter}
                    disabled={!fichierZip || enEnvoi}
                    className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {enEnvoi ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    Importer les photos
                </button>
            </div>
        </Modal>
    );
}