/**
 * Modale d'invitation des adhérents.
 * Deux modes, au choix via un bascule en haut de la modale :
 *   1. "Formulaire" : invitation unique (comportement existant, inchangé).
 *   2. "Fichier CSV" : import en masse, une invitation par ligne, au format
 *      "Prénom;Nom;Adresse mail" (sans en-tête).
 *
 * Endpoint pour le CSV : POST /utilisateurs/creations-csv
 * (multipart/form-data, champ "csv") → renvoie :
 *   { etat: boolean; detail: { donnees: Adherent[]; erreurs: string[] } }
 * - donnees : la liste complète des adhérents à jour (nouvelles invitations incluses)
 * - erreurs : une entrée par ligne non traitée, ex.
 *   "Camille;Dupont;camille@invalide : adresse e-mail invalide"
 *
 * NB : l'URL contient un accent ("créations-csv" dans la demande d'origine) ;
 * je l'ai laissée telle quelle ci-dessous mais un accent dans un chemin d'API
 * est inhabituel (encodage, sensibilité selon l'environnement). Si ce n'est
 * pas volontaire, remplace ROUTE_CSV par "/utilisateurs/creations-csv".
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, FileText, Upload, AlertTriangle, UserPlus } from "lucide-react";
import Modal from "../Modal";
import { useRequete } from "../../../fonctions/requete";
import type { Adherent } from "../../../constantes/types/adherents";

interface Props {
    ouvert: boolean;
    onFermer: () => void;
    setter: React.Dispatch<React.SetStateAction<Adherent[] | null>>;
    adherent?: Adherent;
}

type ReponseImportCsv = {
    donnees: Adherent[];
    erreurs: string[];
};

type Mode = "formulaire" | "csv";

export default function ModalInviterAdherent({ ouvert, onFermer, setter, adherent }: Props) {
    const [mode, setMode] = useState<Mode>("csv");

    // --- Mode formulaire ---
    const [prenom, setPrenom] = useState("");
    const [nom, setNom] = useState("");
    const [mail, setMail] = useState("");
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoiEnCours, setEnvoiEnCours] = useState(false);

    // --- Mode CSV ---
    const [fichierCsv, setFichierCsv] = useState<File | null>(null);
    const [erreurCsv, setErreurCsv] = useState<string | null>(null);
    const [erreursImport, setErreursImport] = useState<string[]>([]);
    const [envoiCsvEnCours, setEnvoiCsvEnCours] = useState(false);
    const [survole, setSurvole] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const requete = useRequete();

    useEffect(() => {
        function attributionsDonnees() {
            if (adherent) {
                setMode('formulaire')
                setPrenom(adherent.prenom)
                setNom(adherent.nom)
                setMail(adherent.mail)
            }
        }
        attributionsDonnees()
    }, [adherent])


    function reinitialiser() {
        setMode("csv");
        setPrenom("");
        setNom("");
        setMail("");
        setErreur(null);
        setEnvoiEnCours(false);
        setFichierCsv(null);
        setErreurCsv(null);
        setErreursImport([]);
        setEnvoiCsvEnCours(false);
        setSurvole(false);
    }

    function fermer() {
        reinitialiser();
        onFermer();
    }

    function changerMode(m: Mode) {
        setMode(m);
        setErreur(null);
        setErreurCsv(null);
        setErreursImport([]);
    }

    async function envoyerInvitation() {
        if (!prenom.trim() || !nom.trim() || !mail.trim()) {
            setErreur("Merci de renseigner le prénom, le nom et l'adresse e-mail.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim())) {
            setErreur("Cette adresse e-mail n'a pas l'air valide.");
            return;
        }

        setErreur(null);
        setEnvoiEnCours(true);
        try {
            const  chemin = adherent ? "modifier" : "inviter"
            const reponse = await requete({ url: "/utilisateurs/" + chemin, methode: "POST", corps: { prenom: prenom.trim(), nom: nom.trim(), mail: mail.trim() } });
            if (reponse.inviter == "erreur") {
                setErreur(reponse.detail);
                setEnvoiEnCours(false);
            } else {
                setter(reponse);
                fermer();
            }
        } catch {
            setErreur("L'invitation n'a pas pu être envoyée. Réessaie dans un instant.");
            setEnvoiEnCours(false);
        }
    }

    function choisirFichierCsv(f: File | null) {
        setErreurCsv(null);
        setErreursImport([]);
        if (!f) {
            setFichierCsv(null);
            return;
        }
        if (!f.name.toLowerCase().endsWith(".csv")) {
            setErreurCsv("Le fichier doit être au format .csv.");
            return;
        }
        setFichierCsv(f);
    }

    function onDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setSurvole(false);
        choisirFichierCsv(e.dataTransfer.files?.[0] ?? null);
    }

    async function envoyerCsv() {
        if (!fichierCsv) return;
        setEnvoiCsvEnCours(true);
        setErreurCsv(null);
        setErreursImport([]);
        try {
            const formData = new FormData();
            formData.append("csv", fichierCsv);

            const reponse: ReponseImportCsv = await requete({
                url: "/utilisateurs/inviter-csv",
                methode: "POST",
                corps: formData,
                formData: true
            });

            if (reponse.erreurs.length > 0) {
                setErreursImport(reponse.erreurs);
            }
            setter(reponse.donnees);
            if (reponse.erreurs.length === 0) {
                fermer();
            } else {
                setFichierCsv(null);
            }
        } catch {
            setErreurCsv("L'import n'a pas pu être effectué. Vérifiez le format du fichier et réessayez.");
        } finally {
            setEnvoiCsvEnCours(false);
        }
    }

    return (
        <Modal ouvert={ouvert} titre="Inviter des adhérents" onFermer={fermer} largeurMax="sm">
            {!adherent &&
                <div className="mb-4 flex gap-1 rounded-lg bg-club-50 p-1">
                    <button
                        type="button"
                        onClick={() => changerMode("formulaire")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition ${mode === "formulaire" ? "bg-white text-club-900 shadow-sm" : "text-club-600 hover:text-club-900"} cursor-pointer`}
                    >
                        <UserPlus size={14} />
                        Invitation unique
                    </button>
                    <button
                        type="button"
                        onClick={() => changerMode("csv")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition ${mode === "csv" ? "bg-white text-club-900 shadow-sm" : "text-club-600 hover:text-club-900"} cursor-pointer`}
                    >
                        <FileText size={14} />
                        Invitations multiple
                    </button>
                </div>}

            {mode === "formulaire" ? (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="prenom" className="text-sm font-medium text-club-700">
                            Prénom
                        </label>
                        <input id="prenom" type="text" value={prenom} autoComplete="off" onChange={(e) => setPrenom(e.target.value)} placeholder="Camille" className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="nom" className="text-sm font-medium text-club-700">
                            Nom
                        </label>
                        <input id="nom" type="text" value={nom} autoComplete="off" onChange={(e) => setNom(e.target.value)} placeholder="Dupont" className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="mail" className="text-sm font-medium text-club-700">
                            Adresse e-mail
                        </label>
                        <input id="mail" type="email" value={mail} autoComplete="off" onChange={(e) => setMail(e.target.value)} placeholder="camille.dupont@exemple.com" className="w-full rounded-lg border border-club-200 px-3 py-2 text-sm text-club-900 outline-none transition focus:border-club-600 focus:ring-2 focus:ring-club-200" />
                    </div>

                    {erreur && <p className="text-sm text-red-600">{erreur}</p>}

                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={fermer} className="rounded-lg px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={envoyerInvitation}
                            disabled={envoiEnCours}
                            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-50"
                        >
                            {envoiEnCours && <Loader2 size={16} className="animate-spin" />}
                            {adherent ? "Mettre à jour" : "Envoyer l'invitation"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-club-900/70 text-justify">Déposez un fichier .csv contenant une ligne par adhérent, au format "Prénom;Nom;Adresse mail" (sans ligne d'en-tête).</p>

                    <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => choisirFichierCsv(e.target.files?.[0] ?? null)} />

                    <div
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => setSurvole(true)}
                        onDragLeave={() => setSurvole(false)}
                        onDrop={onDrop}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition ${survole ? "border-club-500 bg-club-100" : "border-club-200 bg-club-50 hover:border-club-400"}`}
                    >
                        <FileText size={26} className="text-club-300" />
                        {fichierCsv ? <span className="text-sm font-medium text-club-700">{fichierCsv.name}</span> : <span className="text-sm font-medium text-club-600">Cliquer ou glisser un fichier .csv ici</span>}
                    </div>

                    {erreurCsv && <p className="text-sm text-red-600">{erreurCsv}</p>}

                    {erreursImport.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
                                <AlertTriangle size={16} />
                                {erreursImport.length} ligne(s) non traitée(s) :
                            </p>
                            <ul className="list-disc pl-5 text-sm text-amber-800">
                                {erreursImport.map((e, i) => (
                                    <li key={i}>{e}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={fermer} className="rounded-lg px-4 py-2 text-sm font-medium text-club-700 transition hover:bg-club-50">
                            {erreursImport.length > 0 ? "Fermer" : "Annuler"}
                        </button>
                        <button
                            type="button"
                            onClick={envoyerCsv}
                            disabled={!fichierCsv || envoiCsvEnCours}
                            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {envoiCsvEnCours ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            Envoyer les invitations
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}