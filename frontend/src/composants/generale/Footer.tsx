/**
 * Footer du site.
 */

import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import Facebook from "../../assets/footer/facebook.svg?react";
import Instagram from "../../assets/footer/instagram.svg?react";
import Strava from "../../assets/footer/strava.svg?react";
import Logo from "../../assets/logo.svg?react";
import LienFooter from "../footer/LienFooter";

const CACHE_KEY = "rva-cache_pages_modifiable";

type ReseauSocial = {
    href: string;
    label: string;
    Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    classNameIcone: string;
};

const RESEAUX: ReseauSocial[] = [
    {
        href: "https://www.strava.com/clubs/runningvincennesassociation",
        label: "Strava",
        Icon: Strava,
        classNameIcone: "h-6 w-6",
    },
    {
        href: "https://www.facebook.com/people/Running-Vincennes-Association/100027790136650/",
        label: "Facebook",
        Icon: Facebook,
        classNameIcone: "h-9 w-9",
    },
    {
        href: "https://www.instagram.com/runningvincennesasso/",
        label: "Instagram",
        Icon: Instagram,
        classNameIcone: "h-6 w-6",
    },
];

const LIENS_FOOTER_STATIQUES = [
    { href: "/", label: "Accueil" },
    { href: "/calendrier", label: "Calendrier des courses" },
    { href: "/blog", label: "Blog" },
    { href: "/nos-partenaires", label: "Nos partenaires" },
    { href: "/notre-histoire", label: "Notre histoire" },
    { href: "/connexion", label: "Espace membres" },
];

export default function Footer() {
    const annee = new Date().getFullYear();

    const [pagesModifiables, setPagesModifiables] = useState<{ href: string; label: string }[]>(() => {
        const cacheSauvegarde = localStorage.getItem(CACHE_KEY);
        if (cacheSauvegarde) {
            try {
                const parse = JSON.parse(cacheSauvegarde);
                if (Array.isArray(parse)) return parse;
            } catch (e) {
                console.error("Erreur de lecture du cache footer :", e);
            }
        }
        return [];
    });

    useEffect(() => {
        const controller = new AbortController();

        async function recuperation() {
            try {
                const reponse = await fetch("/pages/navbar", {
                    signal: controller.signal,
                    headers: {
                        Accept: "application/json",
                    },
                });

                if (!reponse.ok) {
                    throw new Error(`Erreur HTTP: ${reponse.status}`);
                }

                const donnees = await reponse.json();

                if (Array.isArray(donnees)) {
                    const pages = donnees.map((page: { url: string; titre: string }) => ({
                        href: page.url,
                        label: page.titre,
                    }));
                    setPagesModifiables(pages);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(pages));
                }
            } catch (erreur: any) {
                if (erreur?.name !== "AbortError") {
                    console.error("Erreur lors de la mise à jour des pages du footer :", erreur);
                }
            }
        }

        recuperation();

        return () => {
            controller.abort();
        };
    }, []);

    return (
        <footer className="bg-[#0B2270] text-club-100">
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:justify-between">
                {/* Club */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <Logo className="h-25" />
                        <span className="font-display text-base font-bold leading-tight text-white">
                            RUNNING VINCENNES ASSOCIATION
                        </span>
                    </div>
                    <p className="max-w-2xs text-sm text-club-100/80">
                        Club de course à pied affilié FFA : entraînements, courses et bonne humeur.
                    </p>
                </div>

                {/* Navigation principale */}
                <nav className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-club-100/90">
                        Navigation
                    </span>
                    {LIENS_FOOTER_STATIQUES.map((lien) => (
                        <NavLink
                            key={lien.href}
                            to={lien.href}
                            className={({ isActive }) =>
                                `text-sm text-club-100 transition hover:text-white ${isActive ? "underline" : ""}`
                            }
                        >
                            {lien.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Pages dynamiques (si existantes) */}
                {pagesModifiables.length > 0 && (
                    <nav className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-club-100/90">
                            Autres pages
                        </span>
                        {pagesModifiables.map((lien) => (
                            <NavLink
                                key={lien.href}
                                to={lien.href}
                                className={({ isActive }) =>
                                    `text-sm text-club-100 transition hover:text-white ${isActive ? "underline" : ""}`
                                }
                            >
                                {lien.label}
                            </NavLink>
                        ))}
                    </nav>
                )}

                {/* Réseaux sociaux */}
                <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-club-100">
                        Suivez-nous
                    </span>
                    <div className="flex items-center gap-3">
                        {RESEAUX.map(({ href, label, Icon, classNameIcone }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                title={label}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white transition hover:border-accent-700 hover:bg-accent-700 hover:text-white"
                            >
                                <Icon className={`${classNameIcone} text-white`} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bas de page : copyright + mentions légales */}
            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-3 px-6 py-5 text-xs text-club-100/70 sm:flex-row">
                    <p>© {annee} Running Vincennes Association. Tous droits réservés.</p>
                    <div className="flex items-center gap-4">
                        <LienFooter chemin="/mentions-legales" texte="Mentions légales" />
                        <LienFooter chemin="/politique-confidentialite" texte="Confidentialité" />
                        <LienFooter chemin="/cgu" texte="CGU" />
                        <LienFooter chemin="/credits" texte="Crédits" />
                    </div>
                </div>
            </div>
        </footer>
    );
}