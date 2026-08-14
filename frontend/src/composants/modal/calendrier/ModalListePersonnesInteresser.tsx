import { useEffect, useState } from "react";
import Modal from "../Modal";
import { CheckCircle2, Heart, X } from "lucide-react";
import type { ObjetInteressementAdherent } from "../../../constantes/types/calendrier";

interface ModalListePersonnesInteresserProps {
    ouvert: boolean;
    onFermer: () => void;
    listePersonnes: ObjetInteressementAdherent[] | null;
}

export default function ModalListePersonnesInteresser({
    ouvert,
    onFermer,
    listePersonnes = [],
}: ModalListePersonnesInteresserProps) {
    const [ongletActif, setOngletActif] = useState<"tous" | "participe" | "interesse">("tous");
    const [membreAgrandi, setMembreAgrandi] = useState<ObjetInteressementAdherent | null>(null)

    useEffect(() => {
        if (!membreAgrandi) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setMembreAgrandi(null);
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [membreAgrandi]);

    const participants = listePersonnes?.filter((p) => p.statut === "participe");
    const interesses = listePersonnes?.filter((p) => p.statut === "interesse");

    const personnesAffichees =
        ongletActif === "participe"
            ? participants
            : ongletActif === "interesse"
                ? interesses
                : listePersonnes;

    return (
        <Modal ouvert={ouvert} titre="Personnes intéressées & participants" onFermer={onFermer} largeurMax="md">
            <div className="flex flex-col gap-4">
                {/* Filtres par Onglets */}
                <div className="flex border-b border-gray-100 pb-2 text-sm">
                    <button
                        type="button"
                        onClick={() => setOngletActif("tous")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${ongletActif === "tous"
                            ? "bg-club-50 text-club-700"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Tous ({listePersonnes?.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setOngletActif("participe")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${ongletActif === "participe"
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Participe ({participants?.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setOngletActif("interesse")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${ongletActif === "interesse"
                            ? "bg-amber-50 text-amber-700"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <Heart size={14} className="text-amber-600" />
                        Intéressés ({interesses?.length})
                    </button>
                </div>

                {/* Liste des personnes */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 pr-1">
                    {personnesAffichees?.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">
                            Aucune personne dans cette catégorie.
                        </div>
                    ) : (
                        personnesAffichees?.map((personne) => (
                            <div key={personne.id} className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-3">
                                    {/* Avatar ou Initiale */}
                                    {personne.cheminTrombinoscope ? (
                                        <button
                                            onClick={() => setMembreAgrandi(personne)}
                                        >
                                            <img
                                                src={"/utilisateurs/photo/" + personne.cheminTrombinoscope}
                                                alt={`${personne.prenom} ${personne.nom}`}
                                                className="h-9 w-9 rounded-full object-cover border border-gray-200"
                                            />
                                        </button>
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-club-100 font-display  font-semibold text-club-600">
                                            {personne.prenom?.[0]}
                                            {personne.nom?.[0]}
                                        </div>
                                    )}

                                    {/* Nom & Prénom */}
                                    <span className="text-sm font-medium text-gray-800">
                                        {personne.prenom} {personne.nom}
                                    </span>
                                </div>

                                {/* Badge statut */}
                                {personne.statut === "participe" ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 size={12} />
                                        Participe
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                                        <Heart size={12} />
                                        Intéressé(e)
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* Lightbox : photo agrandie */}
            {membreAgrandi && membreAgrandi.cheminTrombinoscope && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
                    onClick={() => setMembreAgrandi(null)}
                >
                    <button
                        type="button"
                        onClick={() => setMembreAgrandi(null)}
                        aria-label="Fermer"
                        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X size={22} />
                    </button>
                    <figure
                        className="flex max-h-full max-w-full flex-col items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={"/utilisateurs/photo/" + membreAgrandi.cheminTrombinoscope}
                            alt={`Photo de ${membreAgrandi.prenom} ${membreAgrandi.nom}`}
                            className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                        />
                        <figcaption className="text-sm font-medium text-white/90">
                            {membreAgrandi.prenom} {membreAgrandi.nom}
                        </figcaption>
                    </figure>
                </div>
            )}
        </Modal>
    );
}