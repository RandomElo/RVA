/**
 * Navbar du site - Version Optimisée
 */

import { useEffect, useMemo, useRef, useState, useTransition, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, LogOut, User, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useRequete } from "../../fonctions/requete";
import Logo from "../../assets/logo.svg?react";
import { useNotifications } from "../../contexts/NotificationsContext";
import BandeauAnniversaire from "./BandeauAnniversaire";

interface Lien {
    href: string;
    label: string;
    end?: boolean;
}

const CACHE_KEY = "rva-cache_pages_modifiable";

const LIENS_PUBLICS: Lien[] = [
    { href: "/", label: "Accueil" },
    { href: "/calendrier", label: "Calendrier des courses" },
    { href: "/blog", label: "Blog" },
];

const ESPACE_ADMIN: Lien[] = [
    { href: "/administration", label: "Tableau de bord", end: true },
    { href: "/administration/blog", label: "Gestion du blog" },
    { href: "/administration/courses", label: "Gestion des courses" },
    { href: "/administration/adherents", label: "Gestion des adhérents" },
    { href: "/administration/pages", label: "Gestion des pages" },
    { href: "/administration/images", label: "Gestion des images" },
    { href: "/administration/specialistes-sante", label: "Gestion des prof. de santé" },
    { href: "/administration/statistiques", label: "Statistiques" },
    { href: "/rediger-article", label: "Rédiger un article" },
];

// Menu déroulant desktop
function MenuDeroulant({
    label,
    liens,
    onNavigate,
}: {
    label: string;
    liens: Lien[];
    onNavigate: (href: string) => void;
}) {
    const [ouvert, setOuvert] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function fermerSiExterieur(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOuvert(false);
            }
        }
        function fermerSiEchap(e: KeyboardEvent) {
            if (e.key === "Escape") setOuvert(false);
        }

        document.addEventListener("mousedown", fermerSiExterieur);
        document.addEventListener("keydown", fermerSiEchap);
        return () => {
            document.removeEventListener("mousedown", fermerSiExterieur);
            document.removeEventListener("keydown", fermerSiEchap);
        };
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOuvert((v) => !v)}
                className="flex items-center gap-1 text-sm font-medium text-club-100 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 rounded-md px-2 py-1"
                aria-expanded={ouvert}
                aria-haspopup="true"
            >
                {label}
                <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${ouvert ? "rotate-180" : ""}`}
                />
            </button>

            {ouvert && (
                <div className="absolute left-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-club-100 bg-white py-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                    {liens.map((lien) => (
                        <NavLink
                            key={lien.href}
                            to={lien.href}
                            end={lien.end}
                            onClick={(e) => {
                                e.preventDefault();
                                setOuvert(false);
                                onNavigate(lien.href);
                            }}
                            className={({ isActive }) =>
                                `block px-4 py-2 text-sm transition ${isActive
                                    ? "bg-club-50 font-medium text-club-700"
                                    : "text-club-700 hover:bg-club-50 hover:text-club-900"
                                }`
                            }
                        >
                            {lien.label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
}

// Menu utilisateur connecté
function MenuUtilisateur({
    gererDeconnexion,
    deconnexionEnCours,
}: {
    gererDeconnexion: () => void;
    deconnexionEnCours: boolean;
}) {
    const [ouvert, setOuvert] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function fermerSiExterieur(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOuvert(false);
            }
        }
        function fermerSiEchap(e: KeyboardEvent) {
            if (e.key === "Escape") setOuvert(false);
        }

        document.addEventListener("mousedown", fermerSiExterieur);
        document.addEventListener("keydown", fermerSiEchap);
        return () => {
            document.removeEventListener("mousedown", fermerSiExterieur);
            document.removeEventListener("keydown", fermerSiEchap);
        };
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOuvert((v) => !v)}
                aria-label="Menu du compte"
                aria-expanded={ouvert}
                aria-haspopup="true"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
                <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle
                        cx="20"
                        cy="20"
                        r="19"
                        stroke="white"
                        strokeOpacity="0.4"
                        strokeWidth="1.5"
                    />
                </svg>
                {deconnexionEnCours ? (
                    <Loader2 size={18} className="relative z-10 animate-spin" />
                ) : (
                    <User size={18} className="relative z-10" />
                )}
            </button>

            {ouvert && (
                <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-club-100 bg-white py-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                        type="button"
                        onClick={() => {
                            setOuvert(false);
                            gererDeconnexion();
                        }}
                        disabled={deconnexionEnCours}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-club-700 hover:bg-club-50 disabled:opacity-50 transition"
                    >
                        {deconnexionEnCours ? (
                            <Loader2 className="animate-spin" size={15} />
                        ) : (
                            <LogOut size={15} />
                        )}
                        Déconnexion
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Navbar() {
    const [menuOuvert, setMenuOuvert] = useState(false);
    const [sectionMobileOuverte, setSectionMobileOuverte] = useState<string | null>(null);

    const [estEnTransition, startTransition] = useTransition();
    const [cibleNavigation, setCibleNavigation] = useState<string | null>(null);

    const navbarRef = useRef<HTMLElement>(null);

    const { estAuth, role, deconnexion } = useAuth();
    const navigation = useNavigate();
    const requete = useRequete();
    const { notifier } = useNotifications();

    // Navigation fluide optimisée
    const naviguerAvecAttente = useCallback((href: string) => {
        setCibleNavigation(href);
        startTransition(() => {
            navigation(href);
            setMenuOuvert(false);
        });
    }, [navigation]);

    // Reset de la cible une fois la transition terminée
    useEffect(() => {
        if (!estEnTransition) {
            setCibleNavigation(null);
        }
    }, [estEnTransition]);

    // Préchargement léger au survol
    const prechargerRoute = useCallback((href: string) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = href;
        document.head.appendChild(link);
    }, []);

    // Fermeture automatique au clic extérieur ou Echap
    useEffect(() => {
        function gererClicExterieur(event: MouseEvent) {
            if (
                menuOuvert &&
                navbarRef.current &&
                !navbarRef.current.contains(event.target as Node)
            ) {
                setMenuOuvert(false);
            }
        }

        function gererToucheEchap(event: KeyboardEvent) {
            if (menuOuvert && event.key === "Escape") {
                setMenuOuvert(false);
            }
        }

        document.addEventListener("mousedown", gererClicExterieur);
        document.addEventListener("keydown", gererToucheEchap);

        return () => {
            document.removeEventListener("mousedown", gererClicExterieur);
            document.removeEventListener("keydown", gererToucheEchap);
        };
    }, [menuOuvert]);

    const [pagesModifiable, setPagesModifiable] = useState<{ href: string; label: string }[]>(() => {
        const cacheSauvegarde = localStorage.getItem(CACHE_KEY);
        if (cacheSauvegarde) {
            try {
                const parse = JSON.parse(cacheSauvegarde);
                if (Array.isArray(parse)) return parse;
            } catch (e) {
                console.error("Erreur de lecture du cache :", e);
            }
        }
        return [];
    });

    const [deconnexionEnCours, setDeconnexionEnCours] = useState<boolean>(false);

    // Redimensionnement d'écran
    useEffect(() => {
        function gererRedimensionnement() {
            if (window.innerWidth >= 1324) {
                setMenuOuvert(false);
                setSectionMobileOuverte(null);
            }
        }

        window.addEventListener("resize", gererRedimensionnement);
        return () => window.removeEventListener("resize", gererRedimensionnement);
    }, []);

    // Chargement des pages
    useEffect(() => {
        const controller = new AbortController();

        async function recuperation() {
            try {
                const reponse = await fetch("/pages/navbar", {
                    signal: controller.signal,
                    headers: { Accept: "application/json" },
                });

                if (!reponse.ok) throw new Error(`Erreur HTTP: ${reponse.status}`);

                const donnees = await reponse.json();

                if (Array.isArray(donnees)) {
                    const pages = donnees.map((page: { url: string; titre: string }) => ({
                        href: page.url,
                        label: page.titre,
                    }));
                    setPagesModifiable(pages);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(pages));
                }
            } catch (erreur: any) {
                if (erreur?.name !== "AbortError") {
                    console.error("Erreur lors de la mise à jour des pages :", erreur);
                }
            }
        }

        recuperation();
        return () => controller.abort();
    }, []);

    const RESSOURCES = useMemo(() => {
        return [
            ...(estAuth ? [{ href: "/ressources/trombinoscope", label: "Trombinoscope" }] : []),
            { href: "/ressources/plan-entrainement", label: "Plan d'entraînement" },
            { href: "/ressources/vma", label: "Calculateur de VMA" },
            { href: "/ressources/tests-vma", label: "Tests VMA" },
            { href: "/ressources/lexique", label: "Lexique du coureur" },
            ...(estAuth ? [{ href: "/ressources/specialistes-sante", label: "Spécialistes santé" }] : []),
            ...(estAuth ? [{ href: "/ressources/anniversaires", label: "Anniversaires" }] : []),
            { href: "/ressources", label: "Toutes nos ressources", end: true },
        ];
    }, [estAuth]);

    async function gererDeconnexion() {
        setDeconnexionEnCours(true);
        try {
            await requete({ url: "/utilisateurs/deconnexion", methode: "DELETE" });
        } catch (erreur) {
            console.error("Erreur lors de la déconnexion :", erreur);
        } finally {
            deconnexion();
            setDeconnexionEnCours(false);
            notifier({ type: "succes", titre: "Succès", description: "Vous êtes correctement déconnecté." });
            naviguerAvecAttente("/");
        }
    }

    const menuRole =
        estAuth && role === "administrateur"
            ? { label: "Administration", liens: ESPACE_ADMIN }
            : null;

    return (
        <>
            <BandeauAnniversaire />
            <header ref={navbarRef} className="sticky top-0 z-50">
                {/* BARRE DE CHARGEMENT SUPERIEURE */}
                <div className="h-1 w-full overflow-hidden relative bg-club-600">
                    <div
                        style={{ transitionDuration: estEnTransition ? '3500ms' : '0ms' }}
                        className={`h-full bg-emerald-700 transition-all ease-out ${estEnTransition ? "w-full opacity-100" : "w-0 opacity-0"
                            }`}
                    />
                </div>

                <div className="mx-auto flex items-center justify-between gap-4 px-6 py-3.5 bg-club-600">
                    {/* Logo + nom du club */}
                    <Link
                        to="/"
                        onMouseEnter={() => prechargerRoute("/")}
                        onClick={(e) => {
                            e.preventDefault();
                            naviguerAvecAttente("/");
                        }}
                        className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-white/30 rounded-lg p-1"
                    >
                        <Logo className="h-20 w-auto transition-transform duration-200 group-hover:scale-105" />
                        <span className="font-display text-base font-bold leading-tight text-white sm:text-lg">
                            RUNNING VINCENNES ASSOCIATION
                        </span>
                    </Link>

                    {/* Navigation desktop */}
                    <nav className="hidden items-center gap-6 min-[1324px]:flex">
                        {LIENS_PUBLICS.map((lien) => (
                            <NavLink
                                key={lien.href}
                                to={lien.href}
                                onMouseEnter={() => prechargerRoute(lien.href)}
                                onClick={(e) => {
                                    e.preventDefault();
                                    naviguerAvecAttente(lien.href);
                                }}
                                className={({ isActive }) =>
                                    `relative text-sm font-medium transition flex items-center gap-1.5 px-2 py-1 rounded-md ${isActive
                                        ? "text-white underline decoration-2 underline-offset-4 font-semibold"
                                        : "text-club-100 hover:text-white hover:bg-white/5"
                                    }`
                                }
                            >
                                <span>{lien.label}</span>
                                {estEnTransition && cibleNavigation === lien.href && (
                                    <span className="absolute -right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="animate-spin text-white" size={12} />
                                    </span>
                                )}
                            </NavLink>
                        ))}

                        <MenuDeroulant label="Ressources" liens={RESSOURCES} onNavigate={naviguerAvecAttente} />

                        {!estAuth && (
                            <NavLink
                                to="/notre-histoire"
                                onMouseEnter={() => prechargerRoute("/notre-histoire")}
                                onClick={(e) => {
                                    e.preventDefault();
                                    naviguerAvecAttente("/notre-histoire");
                                }}
                                className={({ isActive }) =>
                                    `relative text-sm font-medium transition flex items-center gap-1.5 px-2 py-1 rounded-md ${isActive
                                        ? "text-white underline decoration-2 underline-offset-4"
                                        : "text-club-100 hover:text-white hover:bg-white/5"
                                    }`
                                }
                            >
                                <span>Notre histoire</span>
                                {estEnTransition && cibleNavigation === "/notre-histoire" && (
                                    <span className="absolute -right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="animate-spin text-white" size={12} />
                                    </span>
                                )}
                            </NavLink>
                        )}

                        {pagesModifiable.length > 0 && (
                            <MenuDeroulant label="Autres pages" liens={pagesModifiable} onNavigate={naviguerAvecAttente} />
                        )}

                        {menuRole && (
                            <MenuDeroulant label={menuRole.label} liens={menuRole.liens} onNavigate={naviguerAvecAttente} />
                        )}

                        {estAuth ? (
                            <MenuUtilisateur gererDeconnexion={gererDeconnexion} deconnexionEnCours={deconnexionEnCours} />
                        ) : (
                            <NavLink
                                to="/connexion"
                                onMouseEnter={() => prechargerRoute("/connexion")}
                                onClick={(e) => {
                                    e.preventDefault();
                                    naviguerAvecAttente("/connexion");
                                }}
                                className={({ isActive }) =>
                                    `rounded-lg border px-4 py-2 text-sm font-medium transition shadow-sm ${isActive
                                        ? "border-white bg-white text-club-600 font-semibold"
                                        : "border-white/40 text-white hover:bg-white hover:text-club-600"
                                    }`
                                }
                            >
                                Connexion
                            </NavLink>
                        )}
                    </nav>

                    {/* Bouton menu mobile / tablette */}
                    <button
                        type="button"
                        onClick={() => setMenuOuvert((v) => !v)}
                        aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
                        aria-expanded={menuOuvert}
                        className="text-white min-[1324px]:hidden focus:outline-none flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10"
                    >
                        {estEnTransition && <Loader2 className="animate-spin" size={20} />}
                        {menuOuvert ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>

                {/* Navigation mobile / burger */}
                {menuOuvert && (
                    <nav className="absolute right-0 ml-auto flex flex-col gap-1 border-b border-l border-club-400/30 bg-club-600 px-6 pb-5 shadow-xl min-[500px]:w-[500px] min-[500px]:rounded-bl-xl min-[1324px]:hidden z-50 animate-in slide-in-from-top-2 duration-150">
                        {LIENS_PUBLICS.map((lien) => (
                            <NavLink
                                key={lien.href}
                                to={lien.href}
                                onClick={(e) => {
                                    e.preventDefault();
                                    naviguerAvecAttente(lien.href);
                                }}
                                className={({ isActive }) =>
                                    `rounded-lg px-3 py-2.5 text-sm font-medium transition flex items-center justify-between ${isActive
                                        ? "bg-club-400/30 text-white font-semibold"
                                        : "text-club-100 hover:bg-club-400/20 hover:text-white"
                                    }`
                                }
                            >
                                <span>{lien.label}</span>
                                {estEnTransition && cibleNavigation === lien.href && (
                                    <Loader2 className="animate-spin" size={16} />
                                )}
                            </NavLink>
                        ))}

                        {!estAuth && (
                            <NavLink
                                to="/notre-histoire"
                                onClick={(e) => {
                                    e.preventDefault();
                                    naviguerAvecAttente("/notre-histoire");
                                }}
                                className={({ isActive }) =>
                                    `rounded-lg px-3 py-2.5 text-sm font-medium transition flex items-center justify-between ${isActive
                                        ? "bg-club-400/30 text-white font-semibold"
                                        : "text-club-100 hover:bg-club-400/20 hover:text-white"
                                    }`
                                }
                            >
                                <span>Notre histoire</span>
                                {estEnTransition && cibleNavigation === "/notre-histoire" && (
                                    <Loader2 className="animate-spin" size={16} />
                                )}
                            </NavLink>
                        )}

                        {/* Section Ressources mobile */}
                        <button
                            type="button"
                            onClick={() => setSectionMobileOuverte((v) => (v === "ressources" ? null : "ressources"))}
                            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-club-100 hover:bg-club-400/20 hover:text-white transition"
                        >
                            Ressources
                            <ChevronDown
                                size={16}
                                className={`transition-transform duration-200 ${sectionMobileOuverte === "ressources" ? "rotate-180" : ""
                                    }`}
                            />
                        </button>
                        {sectionMobileOuverte === "ressources" && (
                            <div className="ml-3 flex flex-col gap-1 border-l border-club-400/30 pl-3">
                                {RESSOURCES.map((lien) => (
                                    <NavLink
                                        key={lien.href}
                                        to={lien.href}
                                        end={lien.end}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            naviguerAvecAttente(lien.href);
                                        }}
                                        className={({ isActive }) =>
                                            `rounded-lg px-3 py-2 text-sm transition flex items-center justify-between ${isActive
                                                ? "bg-club-400/30 text-white font-medium"
                                                : "text-club-200 hover:bg-club-400/20 hover:text-white"
                                            }`
                                        }
                                    >
                                        <span>{lien.label}</span>
                                        {estEnTransition && cibleNavigation === lien.href && (
                                            <Loader2 className="animate-spin" size={14} />
                                        )}
                                    </NavLink>
                                ))}
                            </div>
                        )}

                        {/* Section Autres pages mobile */}
                        {pagesModifiable.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setSectionMobileOuverte((v) => (v === "autres" ? null : "autres"))}
                                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-club-100 hover:bg-club-400/20 hover:text-white transition"
                                >
                                    Autres pages
                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform duration-200 ${sectionMobileOuverte === "autres" ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>
                                {sectionMobileOuverte === "autres" && (
                                    <div className="ml-3 flex flex-col gap-1 border-l border-club-400/30 pl-3">
                                        {pagesModifiable.map((lien) => (
                                            <NavLink
                                                key={lien.href}
                                                to={lien.href}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    naviguerAvecAttente(lien.href);
                                                }}
                                                className={({ isActive }) =>
                                                    `rounded-lg px-3 py-2 text-sm transition flex items-center justify-between ${isActive
                                                        ? "bg-club-400/30 text-white font-medium"
                                                        : "text-club-200 hover:bg-club-400/20 hover:text-white"
                                                    }`
                                                }
                                            >
                                                <span>{lien.label}</span>
                                                {estEnTransition && cibleNavigation === lien.href && (
                                                    <Loader2 className="animate-spin" size={14} />
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Section Administration mobile */}
                        {menuRole && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setSectionMobileOuverte((v) => (v === "role" ? null : "role"))}
                                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-club-100 hover:bg-club-400/20 hover:text-white transition"
                                >
                                    {menuRole.label}
                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform duration-200 ${sectionMobileOuverte === "role" ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>
                                {sectionMobileOuverte === "role" && (
                                    <div className="ml-3 flex flex-col gap-1 border-l border-club-400/30 pl-3">
                                        {menuRole.liens.map((lien: Lien) => (
                                            <NavLink
                                                key={lien.href}
                                                to={lien.href}
                                                end={lien.end}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    naviguerAvecAttente(lien.href);
                                                }}
                                                className={({ isActive }) =>
                                                    `rounded-lg px-3 py-2 text-sm transition flex items-center justify-between ${isActive
                                                        ? "bg-club-400/30 text-white font-medium"
                                                        : "text-club-200 hover:bg-club-400/20 hover:text-white"
                                                    }`
                                                }
                                            >
                                                <span>{lien.label}</span>
                                                {estEnTransition && cibleNavigation === lien.href && (
                                                    <Loader2 className="animate-spin" size={14} />
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Déconnexion / Connexion Mobile */}
                        {estAuth ? (
                            <button
                                type="button"
                                onClick={gererDeconnexion}
                                disabled={deconnexionEnCours}
                                className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-white/40 px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 transition"
                            >
                                {deconnexionEnCours ? (
                                    <Loader2 className="animate-spin" size={15} />
                                ) : (
                                    <LogOut size={15} />
                                )}
                                Déconnexion
                            </button>
                        ) : (
                            <NavLink
                                to="/connexion"
                                onClick={(e) => {
                                    e.preventDefault();
                                    naviguerAvecAttente("/connexion");
                                }}
                                className={({ isActive }) =>
                                    `mt-2 rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition ${isActive
                                        ? "border-white bg-white text-club-600 font-semibold"
                                        : "border-white/40 text-white hover:bg-white/10"
                                    }`
                                }
                            >
                                Connexion
                            </NavLink>
                        )}
                    </nav>
                )}
            </header>
        </>
    );
}