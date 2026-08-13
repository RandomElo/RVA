/**
 * Modale d'ajout/remplacement de la photo d'un adhérent (cas unitaire).
 * Emplacement suggéré : src/composants/adherents/ModalPhotoAdherent.tsx
 *
 * Usage : composant toujours monté dans la page adhérents, la prop
 * `adherent` détermine s'il est ouvert (null = fermé) et fournit
 * l'adhérent ciblé. Déclenché depuis l'icône appareil photo sur la ligne
 * d'un adhérent précis — le titre affiche directement
 * "Ajouter une photo pour {nom}", pas de choix de mode à faire ici.
 *
 * Prérequis :
 * 1. Adapter le chemin d'import de `Modal` et de `Adherent`.
 * 2. Endpoint suggéré : POST /adherents/:id/photo en multipart/form-data,
 *    champ "photo". Doit renvoyer l'adhérent à jour (au moins { photoUrl }).
 * 3. Vérifier que `useRequete` sait envoyer un FormData en POST ; sinon
 *    remplacer l'appel dans handleValider par un fetch direct.
 */

import { useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { useRequete } from "../../../fonctions/requete";
import Modal from "../Modal";
import type { Adherent } from "../../../constantes/types/adherents";

type Props = {
    adherent: Adherent | null;
    onFermer: () => void;
    setAdherents: React.Dispatch<React.SetStateAction<Adherent[] | null>>;
};

export default function ModalPhotoAdherent({ adherent, onFermer, setAdherents }: Props) {
    const [fichier, setFichier] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [enEnvoi, setEnEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const [survole, setSurvole] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const requete = useRequete();

    function choisirFichier(f: File | null) {
        setErreur(null);
        if (!f) {
            setFichier(null);
            setPreviewUrl(null);
            return;
        }
        if (!f.type.startsWith("image/")) {
            setErreur("Le fichier doit être une image (JPG, PNG…).");
            return;
        }
        setFichier(f);
        setPreviewUrl(URL.createObjectURL(f));
    }

    function onDrop(e: React.DragEvent<HTMLButtonElement>) {
        e.preventDefault();
        setSurvole(false);
        choisirFichier(e.dataTransfer.files?.[0] ?? null);
    }

    function fermerEtReinitialiser() {
        setFichier(null);
        setPreviewUrl(null);
        setErreur(null);
        setEnEnvoi(false);
        onFermer();
    }

    async function handleValider() {
        if (!fichier || !adherent) return;
        setEnEnvoi(true);
        setErreur(null);
        try {
            const formData = new FormData();
            formData.append("photo", fichier);
            const adherentMaj = await requete({
                url: `/utilisateurs/ajouter-photo/${adherent.id}`,
                methode: "POST",
                corps: formData,
                formData: true
            });

            setAdherents(adherentMaj);
            fermerEtReinitialiser();
        } catch {
            setErreur("Échec de l'envoi. Réessayez.");
        } finally {
            setEnEnvoi(false);
        }
    }

    return (
        <Modal ouvert={adherent !== null} titre={adherent ? `Ajouter une photo pour ${adherent.prenom + " " + adherent.nom}` : ""} onFermer={fermerEtReinitialiser}>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)} />

            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setSurvole(true)}
                onDragLeave={() => setSurvole(false)}
                onDrop={onDrop}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition ${survole ? "border-club-500 bg-club-100" : "border-club-200 bg-club-50 hover:border-club-400"}`}
            >
                {previewUrl ? (
                    <img src={previewUrl} alt="Aperçu" className="h-28 w-28 rounded-full object-cover" />
                ) : (
                    <>
                        <Camera size={26} className="text-club-300" />
                        <span className="text-sm font-medium text-club-600">Cliquer pour choisir une photo</span>
                        <span className="text-xs text-club-400">JPG ou PNG, portrait de préférence</span>
                    </>
                )}
            </button>

            {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={fermerEtReinitialiser} className="rounded-lg border border-club-200 px-4 py-2.5 text-sm font-medium text-club-700 transition hover:bg-club-50">
                    Annuler
                </button>
                <button
                    type="button"
                    onClick={handleValider}
                    disabled={!fichier || enEnvoi}
                    className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {enEnvoi ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    Enregistrer
                </button>
            </div>
        </Modal>
    );
}