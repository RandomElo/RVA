import { useEffect, useState } from "react";
import { Image as ImageIcon, FolderLock, Plus, Search, Trash2, Copy, Check, HardDrive, Loader2, SquarePen, Pencil } from "lucide-react";
import { useRequete } from "../../fonctions/requete";
import type { ImageSite } from "../../constantes/types/blog";
import { useNotifications } from "../../contexts/NotificationsContext";
import ModalAjouterImage from "../../composants/modal/blog/ModalAjouterImage";
import ModalSupprimerImage from "../../composants/modal/administration/ModalSupprimerImage";
import ModalModiferAlbum from "../../composants/modal/administration/ModalModifierAlbum";
import ModalModifierAlt from "../../composants/modal/administration/ModalModifierAlt";

const CHEMIN_GALERIE = "/images/i";
const CHEMIN_IMAGES = "/img";

type Onglet = "articles" | "systeme";

interface DetailsUtilisationImage {
    nomFichier: string;
    detail: { titre: string; url: string }[];
}

export default function GestionImages() {
    const [ongletActif, setOngletActif] = useState<Onglet>("articles");
    const [images, setImages] = useState<ImageSite[]>([]);
    const [chargement, setChargement] = useState(true);
    const [recherche, setRecherche] = useState("");
    const [typeModal, setTypeModal] = useState<"ajouter" | "modifier" | null>(null);
    const [copieId, setCopieId] = useState<string | null>(null);
    const [imageASupprimer, setImageASupprimer] = useState<ImageSite | null>(null);
    const [ancienneDonnees, setAnciennesDonnees] = useState<ImageSite | undefined>(undefined);
    const [detailsUtilisationImages, setDetailsUtilisationImages] = useState<DetailsUtilisationImage[]>([]);
    const [imageModfierAlt, setImageModifierAlt] = useState<ImageSite | null>(null)

    const requete = useRequete();
    const { notifier } = useNotifications();

    useEffect(() => {
        async function chargerImages() {
            setChargement(true);
            try {
                const reponse = await requete({
                    url: "/images/recuperer-tout",
                    methode: "GET",
                });

                setImages(reponse);

                const reponseDetailsImages = await requete({ url: "/images/recuperer-details-utilisation" });
                setDetailsUtilisationImages(reponseDetailsImages);
            } catch {
                notifier({
                    type: "erreur",
                    titre: "Erreur de chargement",
                    description: "Impossible de récupérer les images de la galerie.",
                });
            } finally {
                setChargement(false);
            }
        }
        chargerImages();
    }, []);

    function getUrlImageGalerie(image: ImageSite): string {
        return `${CHEMIN_GALERIE}/${image.nomFichier}`;
    }

    function getUrlImageImage(image: ImageSite): string {
        return `${CHEMIN_IMAGES}/${image.nomFichier}`;
    }

    function copierDansPressePapier(texte: string, id: string) {
        navigator.clipboard.writeText(texte);
        setCopieId(id);
        setTimeout(() => setCopieId(null), 2000);
        notifier({
            type: "succes",
            titre: "Copié !",
            description: "Le chemin de l'image a été copié dans le presse-papier.",
        });
    }

    const imagesFiltreesBDD = images
        .filter((img) => img.type === "galerie")
        .filter(
            (img) =>
                img.alt.toLowerCase().includes(recherche.toLowerCase()) ||
                img.nomFichier.toLowerCase().includes(recherche.toLowerCase())
        );

    const imagesFiltreesSysteme = images
        .filter((img) => img.type === "systeme")
        .filter(
            (img) =>
                img.alt.toLowerCase().includes(recherche.toLowerCase()) ||
                img.nomFichier.toLowerCase().includes(recherche.toLowerCase())
        );

    return (
        <div className="conteneurPage space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* En-tête */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-club-900 sm:text-3xl">
                        Gestion des images
                    </h1>
                </div>
                {ongletActif === "articles" && (
                    <button
                        type="button"
                        onClick={() => setTypeModal("ajouter")}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent-700 cursor-pointer"
                    >
                        <Plus size={18} />
                        Ajouter une image
                    </button>
                )}
            </div>

            {/* Navigation Onglets */}
            <div className="flex flex-col gap-4 border-b border-club-100 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setOngletActif("articles")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition cursor-pointer ${ongletActif === "articles"
                            ? "border-club-600 text-club-600"
                            : "border-transparent text-club-700 hover:border-club-200 hover:text-club-900"
                            }`}
                    >
                        <ImageIcon size={18} />
                        Galerie (Articles)
                        <span className="ml-1.5 rounded-full bg-club-50 px-2 py-0.5 text-xs font-semibold text-club-700">
                            {imagesFiltreesBDD.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setOngletActif("systeme")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition cursor-pointer ${ongletActif === "systeme"
                            ? "border-club-600 text-club-600"
                            : "border-transparent text-club-700 hover:border-club-200 hover:text-club-900"
                            }`}
                    >
                        <FolderLock size={18} />
                        Images (Pages)
                        <span className="ml-1.5 rounded-full bg-club-50 px-2 py-0.5 text-xs font-semibold text-club-700">
                            {imagesFiltreesSysteme.length}
                        </span>
                    </button>
                </div>

                {/* Barre de recherche */}
                <div className="relative mb-3 sm:mb-0 sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-club-400" />
                    <input
                        type="text"
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        placeholder="Rechercher une image..."
                        className="inputStyle pl-9! w-full"
                    />
                </div>
            </div>

            {/* --- VOLET 1 : GALERIE BDD (ARTICLES) --- */}
            {ongletActif === "articles" && (
                <>
                    {chargement ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-2 text-club-600">
                            <Loader2 size={32} className="animate-spin" />
                            <span className="text-sm font-medium">Chargement de la galerie...</span>
                        </div>
                    ) : imagesFiltreesBDD.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-club-100 bg-club-50/50 p-6 text-center">
                            <ImageIcon size={40} className="text-club-200" />
                            <div>
                                <p className="font-medium text-club-900">Aucune image trouvée</p>
                                <p className="text-sm text-club-700">
                                    {recherche
                                        ? "Aucune image ne correspond à votre recherche."
                                        : "Importez de nouvelles images pour vos articles."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {imagesFiltreesBDD.map((image) => {
                                const url = getUrlImageGalerie(image);
                                const nombreUtilisations =
                                    detailsUtilisationImages.find((img) => img.nomFichier === image.nomFichier)?.detail
                                        ?.length ?? 0;

                                return (
                                    <div
                                        key={image.nomFichier}
                                        className="group relative flex flex-col overflow-hidden rounded-xl border border-club-100 bg-white shadow-xs transition hover:shadow-md"
                                    >
                                        <div className="relative aspect-video w-full overflow-hidden bg-club-50">
                                            <img
                                                src={url}
                                                alt={image.alt}
                                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                            />
                                            <span className="absolute left-2 top-2 rounded-md bg-club-900/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
                                                {`${nombreUtilisations} utilisation${nombreUtilisations > 1 ? "s" : ""}`}
                                            </span>
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between p-3">
                                            <div>
                                                <p className="text-sm font-semibold text-club-900 truncate" title={image.alt}>
                                                    {image.alt || "Sans description"}
                                                </p>
                                                <p className="text-xs font-mono text-club-400 truncate mt-0.5">
                                                    {url}
                                                </p>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-club-50 pt-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => copierDansPressePapier(url, image.nomFichier)}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-club-600 hover:text-club-900 cursor-pointer"
                                                    >
                                                        {copieId === image.nomFichier ? (
                                                            <>
                                                                <Check size={14} className="text-green-600" />
                                                                <span className="text-green-600">Copié</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy size={14} />
                                                                Copier URL
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setImageModifierAlt(image)}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-club-600 hover:text-club-900 cursor-pointer"
                                                    >
                                                        <>
                                                            <Pencil size={14} />
                                                            Modifier le texte alt.
                                                        </>

                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setImageASupprimer(image)}
                                                    className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50 cursor-pointer"
                                                    title="Supprimer l'image"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* --- VOLET 2 : IMAGES SYSTÈME EN DUR (PAGES) --- */}
            {ongletActif === "systeme" && (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-club-200 bg-club-50/60 p-4 text-club-900">
                        <HardDrive className="mt-0.5 shrink-0 text-club-600" size={20} />
                        <div className="text-sm">
                            <p className="font-semibold">Images hébergées dans le code source</p>
                            <p className="mt-0.5 text-club-700">
                                Les images ci-dessous sont utilisées par les pages fixes du site. Vous pouvez
                                remplacer l'image, mais son nom et son emplacement ne peuvent pas être modifiés.
                            </p>
                        </div>
                    </div>

                    {imagesFiltreesSysteme.length === 0 ? (
                        <p className="py-8 text-center text-sm text-club-700">Aucune image système trouvée.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {imagesFiltreesSysteme.map((imgSys) => {
                                const urlSys = getUrlImageImage(imgSys);
                                return (
                                    <div
                                        key={imgSys.nomFichier}
                                        className="flex flex-col sm:flex-row overflow-hidden rounded-xl border border-club-100 bg-white shadow-xs"
                                    >
                                        <div className="relative h-38 w-full sm:w-48 shrink-0 bg-club-50">
                                            <img
                                                src={urlSys}
                                                alt={imgSys.alt}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLElement).style.display = "none";
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center text-club-200 -z-10">
                                                <ImageIcon size={32} />
                                            </div>
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between p-4">
                                            <div>
                                                <h3 className="font-semibold text-club-900">{imgSys.alt}</h3>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between border-t border-club-50 pt-2 gap-2">
                                                <span
                                                    className="font-mono text-xs text-club-400 truncate max-w-[150px] sm:max-w-[200px]"
                                                    title={urlSys}
                                                >
                                                    {urlSys}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAnciennesDonnees(imgSys);
                                                            setTypeModal("modifier");
                                                        }}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-club-50 px-3 py-1.5 text-xs font-medium text-club-700 transition hover:bg-club-100 hover:text-club-900 cursor-pointer"
                                                    >
                                                        <SquarePen size={14} />
                                                        Remplacer
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => copierDansPressePapier(urlSys, urlSys)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-club-50 px-3 py-1.5 text-xs font-medium text-club-700 transition hover:bg-club-100 hover:text-club-900 cursor-pointer"
                                                    >
                                                        {copieId === urlSys ? (
                                                            <>
                                                                <Check size={14} className="text-green-600" />
                                                                <span className="text-green-600">Copié</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy size={14} />
                                                                Copier
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- MODALE UPLOAD --- */}
            <ModalAjouterImage
                type={typeModal === "ajouter" ? "nouvelleImage" : "remplacerImage"}
                ouvert={typeModal !== null}
                onFermer={() => setTypeModal(null)}
                images={images.filter((img) => img.type === "galerie")}
                setImages={setImages}
                ancienneDonnees={ancienneDonnees}
                editor={
                    {
                        chain: () => ({
                            focus: () => ({
                                setImage: () => ({
                                    run: () => { },
                                }),
                            }),
                        }),
                    } as any
                }
            />

            <ModalSupprimerImage
                imageASupprimer={imageASupprimer}
                setImageASupprimer={setImageASupprimer}
                detailsUtilisationImages={detailsUtilisationImages}
                setImages={setImages}
            />

            <ModalModifierAlt image={imageModfierAlt} onFermer={() => setImageModifierAlt(null)} setImages={setImages} />
        </div>
    );
}