/**
 * Back-office : liste des adhérents (GET /utilisateurs/recuperer-utilisateurs).
 * L'invitation (unique ou par CSV) et la modification passent par ModalInviterAdherent.
 */

import { useState, type Dispatch, type SetStateAction } from "react";
import { Mail, Users, Clock, Camera, Settings } from "lucide-react";
import type { Adherent } from "../../constantes/types/adherents";
import { useListeAdmin } from "../../fonctions/useListeAdmin";
import ListeAdministration from "./ListeAdministration";
import ModalInviterAdherent from "../../composants/modal/administration/ModalInviterAdherent";
import ModalPhotoAdherent from "../../composants/modal/trombinoscope/ModalPhotoAdherent";
import ModalZipPhotos from "../../composants/modal/trombinoscope/ModalZipPhotos";
import ModalActionsAdherent from "../../composants/modal/administration/ModalActionsAdherent";
import ModalConfirmationRelance from "../../composants/modal/administration/ModalConfirmerRelance";
import ModalMailAdherents from "../../composants/modal/administration/ModalMailAdherents";

const ONGLETS_ADHERENTS = [
    { value: "tous", label: "Tous" },
    { value: "actif", label: "Actifs" },
    { value: "en_attente", label: "En attente" },
] as const;

type EtatInvitation = { type: "ferme" } | { type: "inviter" } | { type: "editer"; adherent: Adherent };

const INVITATION_FERMEE: EtatInvitation = { type: "ferme" };

function filtrerAdherent(a: Adherent, onglet: string, recherche: string) {
    const dansOnglet = onglet === "tous" ? true : onglet === "actif" ? !!a.derniereConnexion : !a.derniereConnexion;
    return dansOnglet && (a.nom.toLowerCase().includes(recherche) || a.mail.toLowerCase().includes(recherche));
}

function comparerAdherents(a: Adherent, b: Adherent) {
    return a.derniereConnexion < b.derniereConnexion ? 1 : -1;
}

export default function GestionAdherents() {
    const {
        donnees: adherents,
        setDonnees: setAdherents,
        elementsFiltres,
        enChargement,
        onglet,
        setOnglet,
        recherche,
        setRecherche,
    } = useListeAdmin<Adherent>({
        url: "/utilisateurs/recuperer-utilisateurs",
        filtrer: filtrerAdherent,
        comparer: comparerAdherents,
    });

    const [modalInvitation, setModalInvitation] = useState<EtatInvitation>(INVITATION_FERMEE);
    const [modalPhotoAdherent, setModalPhotoAdherent] = useState<Adherent | null>(null);
    const [modalImportPhotosZip, setModalImportPhotosZip] = useState<boolean>(false);
    const [modalActionsAdherents, setModalActionsAdherents] = useState<Adherent | null>(null);
    const [modalConfirmerRelance, setModalConfirmerRelance] = useState<Adherent | null>(null);
    const [modalMailAdherents, setModalMailAdherents] = useState<number | null>(null);

    // ModalActionsAdherent ouvre l'édition via un setter à l'ancienne forme (Adherent | boolean | null) : on le traduit vers EtatInvitation.
    const setInvitationDepuisActions: Dispatch<SetStateAction<Adherent | boolean | null>> = (valeur) => {
        if (typeof valeur === "function") return;
        if (valeur === true) setModalInvitation({ type: "inviter" });
        else if (valeur === false || valeur === null) setModalInvitation(INVITATION_FERMEE);
        else setModalInvitation({ type: "editer", adherent: valeur });
    };

    return (
        <ListeAdministration
            titreDocument="Gestion adhérents"
            titre="Adhérents"
            action={{ texte: "Inviter des adhérents", onClick: () => setModalInvitation({ type: "inviter" }) }}
            onglets={ONGLETS_ADHERENTS}
            onglet={onglet}
            setOnglet={setOnglet}
            recherche={recherche}
            setRecherche={setRecherche}
            placeholderRecherche="Rechercher un nom, un e-mail…"
            barreSecondaire={
                <div className="flex justify-end gap-3 mb-5">
                    {adherents && (
                        <button type="button" className="flex items-center justify-center gap-2 rounded-lg border border-club-200 px-4 py-2.5 text-sm font-medium text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalMailAdherents(adherents.length)}>
                            <Mail size={16} />
                            Envoyer un mail aux adhérents
                        </button>
                    )}

                    <button className="flex items-center justify-center  gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition bg-accent-500 hover:bg-accent-700" onClick={() => setModalImportPhotosZip(true)}>
                        + Télécharger un .zip pour le trombinoscope
                    </button>
                </div>
            }
            enChargement={enChargement}
            texteChargement="Chargement des adhérents…"
            estVide={elementsFiltres.length === 0}
            texteVide="Aucun adhérent ne correspond à cette recherche."
            modales={
                <>
                    <ModalInviterAdherent ouvert={modalInvitation.type !== "ferme"} onFermer={() => setModalInvitation(INVITATION_FERMEE)} setter={setAdherents} adherent={modalInvitation.type === "editer" ? modalInvitation.adherent : undefined} />
                    <ModalPhotoAdherent adherent={modalPhotoAdherent} onFermer={() => setModalPhotoAdherent(null)} setAdherents={setAdherents} />

                    <ModalZipPhotos ouvert={modalImportPhotosZip} onFermer={() => setModalImportPhotosZip(false)} setAdherents={setAdherents} />

                    <ModalActionsAdherent ouvert={modalActionsAdherents !== null} onFermer={() => setModalActionsAdherents(null)} adherent={modalActionsAdherents} setAdherents={setAdherents} setModalInviterMembre={setInvitationDepuisActions} />

                    <ModalConfirmationRelance ouvert={!!modalConfirmerRelance} onFermer={() => setModalConfirmerRelance(null)} mail={modalConfirmerRelance?.mail} />

                    <ModalMailAdherents ouvert={!!modalMailAdherents} nombreDestinataires={modalMailAdherents ?? 0} onFermer={() => setModalMailAdherents(null)} />
                </>
            }
        >
            {elementsFiltres.map((a) => (
                <li key={a.id} className="flex items-center gap-4 rounded-xl border border-club-100 bg-white px-4 py-3 transition hover:border-club-200">
                    {/* Avatar (initiales) */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-club-50 text-sm font-semibold text-club-600">
                        {a.cheminTrombinoscope ? (
                            <img src={"/utilisateurs/photo/" + a.cheminTrombinoscope} alt={`Photo de ${a.prenom} ${a.nom}`} className="h-full w-full object-cover" />
                        ) : (
                            a.nom
                                .split(" ")
                                .map((mot) => mot[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                        )}
                    </div>
                    {/* Infos */}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#040F33]">
                            {a.prenom} {a.nom}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-[#0B2270]/50">
                                <Mail size={11} />
                                {a.mail}
                            </span>
                            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${a.derniereConnexion ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                {a.derniereConnexion ? <Users size={11} /> : <Clock size={11} />}
                                {a.derniereConnexion ? "Actif" : "En attente"}
                            </span>
                            {a.derniereConnexion && <span className="text-xs text-[#0B2270]/50">Connecté le {new Date(a.derniereConnexion).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                        {!a.derniereConnexion && (
                            <button type="button" aria-label="Renvoyer l'invitation" title="Renvoyer l'invitation" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalConfirmerRelance(a)}>
                                <Mail size={16} />
                            </button>
                        )}
                        {!a.cheminTrombinoscope && (
                            <button type="button" aria-label="Ajouter une photo" title="Ajouter une photo" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalPhotoAdherent(a)}>
                                <Camera size={16} />
                            </button>
                        )}

                        <button type="button" aria-label="Modifier l'utilisateur" title="Modifier l'utilisateur" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0B2270] transition hover:bg-club-50" onClick={() => setModalActionsAdherents(a)}>
                            <Settings size={16} />
                        </button>
                    </div>
                </li>
            ))}
        </ListeAdministration>
    );
}
