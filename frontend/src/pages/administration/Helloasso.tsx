import { useEffect, useState, useMemo } from "react";
import { useRequete } from "../../fonctions/requete";
import { ExternalLink, Calendar, Users, Ticket, Heart, Eye, X, Loader2, UserCheck, FileText, Search, MapPin, Tag, Phone } from "lucide-react";
import type { HelloAssoForm, HelloAssoFormsResponse, HelloAssoItem } from "../../constantes/types/helloasso";
import { normaliserVille, supprimerAccents } from "../../fonctions/normaliserVille";
import ModalNouveauFormHelloasso from "../../composants/modal/administration/ModalNouveauFormHelloasso";
import ConnexionHelloAsso from "../../composants/modal/ConnexionHelloAsso";

export default function Helloasso() {
    const requete = useRequete();
    const [forms, setForms] = useState<HelloAssoForm[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // État de la modale detail
    const [selectedForm, setSelectedForm] = useState<HelloAssoForm | null>(null);
    const [ongletActif, setOngletActif] = useState<"detail" | "inscrits">("detail");

    const [afficherModalNewForm, setAfficherModalNewForm] = useState(false)

    // Données du détail
    const [formDetail, setFormDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

    // Données des inscrits / réponses
    const [inscrits, setInscrits] = useState<HelloAssoItem[]>([]);
    const [loadingInscrits, setLoadingInscrits] = useState<boolean>(false);

    // États de la recherche et filtres
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedItemName, setSelectedItemName] = useState<string>("");

    useEffect(() => {
        async function recuperation() {
            try {
                const reponse: HelloAssoFormsResponse = await requete({ url: "/helloasso/recuperation-forms" });
                if (reponse?.data) {
                    const formulairesValides = reponse.data.filter((item) => item.formType !== "Checkout");
                    setForms(formulairesValides);
                }
            } catch (erreur) {
                console.error("Erreur lors de la récupération des formulaires :", erreur);
            } finally {
                setLoading(false);
            }
        }
        recuperation();
    }, []);

    // Déclencheur à l'ouverture de la modale
    const ouvrirModale = async (form: HelloAssoForm) => {
        setSelectedForm(form);
        setOngletActif("detail");
        setSearchTerm("");
        setSelectedCity("");
        setSelectedItemName("");

        chargerDetail(form);
        chargerReponses(form);
    };

    const chargerDetail = async (form: HelloAssoForm) => {
        setLoadingDetail(true);
        setFormDetail(null);
        try {
            const typeEncode = encodeURIComponent(form.formType);
            const slugEncode = encodeURIComponent(form.formSlug);
            const reponse = await requete({ url: `/helloasso/forms/${typeEncode}/${slugEncode}` });
            setFormDetail(reponse);
        } catch (erreur) {
            console.error("Erreur chargement détail :", erreur);
        } finally {
            setLoadingDetail(false);
        }
    };

    const chargerReponses = async (form: HelloAssoForm) => {
        setLoadingInscrits(true);
        setInscrits([]);

        try {
            const typeEncode = encodeURIComponent(form.formType);
            const slugEncode = encodeURIComponent(form.formSlug);

            let tousLesInscrits: HelloAssoItem[] = [];
            let continuationToken: string | undefined = undefined;
            let tokenPrecedent: string | undefined = undefined;
            let tentatives = 0;
            const MAX_TENTATIVES = 10;

            do {
                tokenPrecedent = continuationToken;

                let url = `/helloasso/items/${typeEncode}/${slugEncode}?pageSize=100`;
                if (continuationToken) {
                    url += `&continuationToken=${encodeURIComponent(continuationToken)}`;
                }

                const reponse = await requete({ url });

                if (reponse && Array.isArray(reponse.data) && reponse.data.length > 0) {
                    tousLesInscrits = [...tousLesInscrits, ...reponse.data];
                    const newToken = reponse.pagination?.continuationToken;

                    if (!newToken || newToken === tokenPrecedent) {
                        continuationToken = undefined;
                    } else {
                        continuationToken = newToken;
                    }
                } else {
                    continuationToken = undefined;
                }

                tentatives++;
            } while (continuationToken && tentatives < MAX_TENTATIVES);

            const inscritsUniques = Array.from(
                new Map(tousLesInscrits.map((item) => [item.id, item])).values()
            );

            setInscrits(inscritsUniques);
        } catch (erreur) {
            console.error("Erreur chargement inscrits :", erreur);
        } finally {
            setLoadingInscrits(false);
        }
    };

    // Extraction des villes depuis customFields ou user/payer
    const villesDisponibles = useMemo(() => {
        const citiesSet = new Set<string>();

        inscrits.forEach((item) => {
            const cityField = item.customFields?.find(
                (field) => field.name.trim().toLowerCase() === "ville"
            );

            const rawCity = cityField?.answer || item.user?.city || item.payer?.city;

            if (rawCity) {
                const cityClean = normaliserVille(rawCity);
                if (cityClean) {
                    citiesSet.add(cityClean);
                }
            }
        });

        return Array.from(citiesSet).sort((a, b) => a.localeCompare(b, "fr"));
    }, [inscrits]);

    // Extraction dynamique de tous les noms d'items uniques présents
    const itemNamesDisponibles = useMemo(() => {
        const namesSet = new Set<string>();
        inscrits.forEach((item) => {
            if (item.name && item.name.trim() !== "") {
                namesSet.add(item.name.trim());
            }
        });
        return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
    }, [inscrits]);

    // Filtrage global des inscrits
    const inscritsFiltres = useMemo(() => {
        return inscrits.filter((item) => {
            // Extraction et normalisation de la ville de l'inscrit
            const cityField = item.customFields?.find(
                (field) => field.name.trim().toLowerCase() === "ville"
            );
            const rawCity = cityField?.answer || item.user?.city || item.payer?.city || "";
            const itemCityClean = normaliserVille(rawCity);

            // Comparaison avec le filtre ville sélectionné
            if (selectedCity && itemCityClean !== selectedCity) {
                return false;
            }

            // Filtre Item Name
            if (selectedItemName) {
                const itemName = (item.name || "").trim().toLowerCase();
                if (itemName !== selectedItemName.toLowerCase()) return false;
            }

            // Filtre Recherche textuelle
            if (searchTerm.trim()) {
                const term = supprimerAccents(searchTerm.toLowerCase().trim());
                const firstName = supprimerAccents((item.user?.firstName || item.payer?.firstName || "").toLowerCase());
                const lastName = supprimerAccents((item.user?.lastName || item.payer?.lastName || "").toLowerCase());
                const email = (item.payer?.email || "").toLowerCase();
                const itemName = (item.name || "").toLowerCase();

                const matchBase =
                    firstName.includes(term) ||
                    lastName.includes(term) ||
                    `${firstName} ${lastName}`.includes(term) ||
                    email.includes(term) ||
                    itemName.includes(term) ||
                    supprimerAccents(itemCityClean.toLowerCase()).includes(term);

                if (matchBase) return true;

                return item.customFields?.some((field) => {
                    const answer = supprimerAccents((field.answer || "").toLowerCase());
                    const fieldName = (field.name || "").toLowerCase();
                    return answer.includes(term) || fieldName.includes(term);
                });
            }

            return true;
        });
    }, [inscrits, searchTerm, selectedCity, selectedItemName]);

    const getBadgeType = (type: string) => {
        switch (type) {
            case "Membership":
                return { label: "Adhésion", icon: Users, color: "bg-blue-100 text-blue-800" };
            case "Event":
                return { label: "Événement", icon: Ticket, color: "bg-purple-100 text-purple-800" };
            case "Donation":
                return { label: "Don", icon: Heart, color: "bg-pink-100 text-pink-800" };
            default:
                return { label: type, icon: Calendar, color: "bg-gray-100 text-gray-800" };
        }
    };

    const getStatusBadge = (state: string) => {
        switch (state) {
            case "Public":
                return <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded">Public</span>;
            case "Private":
                return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded">Privé</span>;
            case "Disabled":
                return <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded">Désactivé</span>;
            default:
                return <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600">Brouillon</span>;
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Chargement des formulaires HelloAsso...</div>;
    }

    return (
        <>
            <div className="p-6 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Formulaires & Campagnes HelloAsso</h1>
                    <button
                        onClick={() => setAfficherModalNewForm(true)}
                        className="py-2 px-4 bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#3353d3] font-medium rounded-lg text-sm transition-colors duration-200">
                        Nouveau formulaire
                    </button>
                </div>

                {/* Cartes des formulaires */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {forms.map((item) => {
                        const typeInfo = getBadgeType(item.formType);
                        const IconeType = typeInfo.icon;

                        return (
                            <div
                                key={item.formSlug}
                                className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden flex flex-col justify-between"
                            >
                                <div>
                                    {item.banner?.publicUrl && (
                                        <img src={item.banner.publicUrl} alt={item.title} className="w-full h-32 object-cover" />
                                    )}

                                    <div className="p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                                <IconeType size={14} />
                                                {typeInfo.label}
                                            </span>
                                            {getStatusBadge(item.state)}
                                        </div>

                                        <h2 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h2>

                                        {item.description && (
                                            <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line mb-4">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                    <button
                                        onClick={() => ouvrirModale(item)}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                                    >
                                        <Eye size={16} />
                                        Gérer & Inscrits
                                    </button>

                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                                    >
                                        Lien HelloAsso
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* MODALE D'INFORMATION ET REPONSES */}
                {selectedForm && (
                    <div
                        onClick={() => setSelectedForm(null)}
                        className="fixed inset-0 bg-black/50 z-50 flex justify-end cursor-pointer"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-3xl h-full p-6 overflow-y-auto shadow-xl flex flex-col justify-between cursor-default"
                        >
                            <div>
                                {/* Entête */}
                                <div className="flex items-start justify-between border-b pb-4 mb-4 gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{selectedForm.title}</h2>
                                    </div>
                                    <button
                                        onClick={() => setSelectedForm(null)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Onglets Navigation */}
                                <div className="flex border-b mb-6 gap-4">
                                    <button
                                        onClick={() => setOngletActif("detail")}
                                        className={`flex items-center gap-2 pb-2 text-sm font-medium border-b-2 transition ${ongletActif === "detail"
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                    >
                                        <FileText size={16} />
                                        Détails du formulaire
                                    </button>
                                    <button
                                        onClick={() => setOngletActif("inscrits")}
                                        className={`flex items-center gap-2 pb-2 text-sm font-medium border-b-2 transition ${ongletActif === "inscrits"
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                    >
                                        <UserCheck size={16} />
                                        Réponses & Inscrits ({inscrits.length})
                                    </button>
                                </div>

                                {/* CONTENU ONGLET 1 : DÉTAILS */}
                                {ongletActif === "detail" && (
                                    <>
                                        {loadingDetail ? (
                                            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                                                <Loader2 className="animate-spin" size={24} />
                                                <span>Récupération des détails...</span>
                                            </div>
                                        ) : formDetail ? (
                                            <div className="space-y-6">
                                                {formDetail.description && (
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Description</h3>
                                                        <p className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded-lg border">
                                                            {formDetail.description}
                                                        </p>
                                                    </div>
                                                )}

                                                {formDetail.tiers?.length > 0 && (
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Tarifs proposés</h3>
                                                        <div className="space-y-3">
                                                            {formDetail.tiers.map((tier: any) => (
                                                                <div key={tier.id} className="p-3 border rounded-lg bg-white shadow-sm flex justify-between items-center">
                                                                    <div>
                                                                        <h4 className="font-bold text-gray-900 text-sm">{tier.label}</h4>
                                                                        <p className="text-xs text-gray-500">{tier.description}</p>
                                                                    </div>
                                                                    <span className="font-bold text-blue-600">
                                                                        {(tier.price / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-red-500">Erreur lors du chargement des détails.</p>
                                        )}
                                    </>
                                )}

                                {/* CONTENU ONGLET 2 : REPONSES & INSCRITS */}
                                {ongletActif === "inscrits" && (
                                    <>
                                        {loadingInscrits ? (
                                            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                                                <Loader2 className="animate-spin" size={24} />
                                                <span>Récupération des réponses...</span>
                                            </div>
                                        ) : inscrits.length > 0 ? (
                                            <div className="space-y-4">
                                                {/* ZONE DE FILTRES ET RECHERCHE */}
                                                <div className="space-y-3 bg-gray-50 p-3 rounded-lg border">
                                                    {/* BARRE DE RECHERCHE TEXTUELLE */}
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                        <input
                                                            type="text"
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            placeholder="Rechercher par nom, prénom, email ou réponse..."
                                                            className="w-full pl-10 pr-10 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        {searchTerm && (
                                                            <button
                                                                onClick={() => setSearchTerm("")}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* MENUS DÉROULANTS CONDITIONNELS */}
                                                    {(villesDisponibles.length > 0 || itemNamesDisponibles.length > 0) && (
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {/* Filtre Ville (Affiché seulement si des villes existent) */}
                                                            {villesDisponibles.length > 0 && (
                                                                <div className="relative flex-1 min-w-[180px]">
                                                                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                                    <select
                                                                        value={selectedCity}
                                                                        onChange={(e) => setSelectedCity(e.target.value)}
                                                                        className="w-full pl-8 pr-4 py-1.5 bg-white border rounded-md text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    >
                                                                        <option value="">Toutes les villes ({villesDisponibles.length})</option>
                                                                        {villesDisponibles.map((city) => (
                                                                            <option key={city} value={city}>
                                                                                {city}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}

                                                            {/* Filtre Item Name (Affiché seulement s'il y a des articles enregistrés) */}
                                                            {itemNamesDisponibles.length > 0 && (
                                                                <div className="relative flex-1 min-w-[180px]">
                                                                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                                    <select
                                                                        value={selectedItemName}
                                                                        onChange={(e) => setSelectedItemName(e.target.value)}
                                                                        className="w-full pl-8 pr-4 py-1.5 bg-white border rounded-md text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    >
                                                                        <option value="">Tous les types ({itemNamesDisponibles.length})</option>
                                                                        {itemNamesDisponibles.map((name) => (
                                                                            <option key={name} value={name}>
                                                                                {name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}

                                                            {/* Bouton pour réinitialiser les filtres s'ils sont actifs */}
                                                            {(selectedCity || selectedItemName || searchTerm) && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedCity("");
                                                                        setSelectedItemName("");
                                                                        setSearchTerm("");
                                                                    }}
                                                                    className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                                                                >
                                                                    Réinitialiser
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* LISTE FILTRÉE */}
                                                {inscritsFiltres.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {inscritsFiltres.map((item) => {
                                                            // Extraction des champs personnalisés spécifiques
                                                            const cityField = item.customFields?.find((f) => f.name.toLowerCase() === "ville");
                                                            const phoneField = item.customFields?.find((f) => f.name.toLowerCase().includes("téléphone"));

                                                            const city = cityField?.answer || item.user?.city || item.payer?.city;
                                                            const phone = phoneField?.answer;

                                                            return (
                                                                <div key={item.id} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                                                                    <div className="flex justify-between items-start border-b pb-2">
                                                                        <div>
                                                                            <h4 className="font-bold text-gray-900 text-base">
                                                                                {item.user?.firstName || item.payer?.firstName} {item.user?.lastName || item.payer?.lastName}
                                                                            </h4>
                                                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                                                <span>{item.payer?.email}</span>
                                                                                {phone && (
                                                                                    <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                                                                                        <Phone size={12} /> {phone}
                                                                                    </span>)}
                                                                                {city && (
                                                                                    <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                                                                                        <MapPin size={12} /> {city}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                                                                {item.name}
                                                                            </span>
                                                                            <p className="text-xs font-bold text-gray-700 mt-1">
                                                                                {(item.initialAmount / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Réponses aux champs personnalisés */}
                                                                    {item.customFields && item.customFields.length > 0 ? (
                                                                        <div className="space-y-2 pt-1">
                                                                            <p className="text-xs font-semibold text-gray-700">Réponses au formulaire :</p>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                                                {item.customFields.map((field) => (
                                                                                    <div key={field.id} className="bg-white p-2 rounded border">
                                                                                        <span className="text-gray-500 block text-[11px]">{field.name}</span>
                                                                                        {field.answer?.startsWith("http") ? (
                                                                                            <a
                                                                                                href={field.answer}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="text-blue-600 underline font-medium break-all inline-flex items-center gap-1"
                                                                                            >
                                                                                                Voir la pièce jointe
                                                                                                <ExternalLink size={12} />
                                                                                            </a>
                                                                                        ) : (
                                                                                            <span className="font-medium text-gray-800">{field.answer || "Non renseigné"}</span>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-500 italic">Aucun champ personnalisé rempli.</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                                                        Aucun résultat ne correspond à vos filtres.
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
                                                Aucune adhésion ou inscription enregistrée pour ce formulaire pour le moment.
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Pied de la modale */}
                            <div className="pt-4 border-t mt-6 flex gap-3">
                                <button
                                    onClick={() => setSelectedForm(null)}
                                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-sm transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <ModalNouveauFormHelloasso ouvert={afficherModalNewForm} onFermer={() => setAfficherModalNewForm(false)} setFormulaires={setForms} />
            <ConnexionHelloAsso />
        </>
    );
}