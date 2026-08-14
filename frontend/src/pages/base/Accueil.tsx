import { useEffect, useRef, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useRequete } from "../../fonctions/requete";
import { ICONE_CATEGORIE, LABEL_CATEGORIE, STYLE_BADGE, type ArticlePublic } from "../../constantes/types/blog";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import { ImageCache } from "../../composants/ImageCache";
import SEO from "../../composants/generale/SEO";

interface Course {
    nom: string;
    lieu: string;
}

interface AccueilJSON {
    entetePage: string;
    texteLien: string;
    presentationClub: string;
    nomCoach: string;
    presentationCoach: string;
    horaireEntrainement1: string;
    horaireEntrainement2: string;
    carte1RessourceEntrainementTitre: string;
    carte1RessourceEntrainementDescription: string;
    carte2RessourceEntrainementTitre: string;
    carte2RessourceEntrainementDescription: string;
    carte3RessourceEntrainementTitre: string;
    carte3RessourceEntrainementDescription: string;
}

const DONNEES_ACCUEIL_PAR_DEFAUT: AccueilJSON = {
    entetePage: "Club de course à pied affilié",
    texteLien: "Fédération Française d'Athlétisme",
    presentationClub: "Un club où l'on court ensemble, de l'entraînement du mardi soir aux lignes de départ des plus grandes courses françaises. Débutants comme confirmés, chacun trouve sa foulée.",
    nomCoach: "Thomas Hairault",
    presentationCoach: "Thomas encadre les entraînements du club toute la saison, avec deux séances hebdomadaires ouvertes à tous les niveaux.",
    horaireEntrainement1: "🗓️ Mardi (sur stade) — 20h00",
    horaireEntrainement2: "🗓️ Samedi (dans le bois) — 10h00",
    carte1RessourceEntrainementTitre: "Calculateur de VMA",
    carte1RessourceEntrainementDescription: "Estimez vos allures d'entraînement à partir de votre VMA.",
    carte2RessourceEntrainementTitre: "Plan d'entraînement",
    carte2RessourceEntrainementDescription: "Des plans adaptés à votre objectif, du 10 km au marathon.",
    carte3RessourceEntrainementTitre: "Lexique du coureur",
    carte3RessourceEntrainementDescription: "Fractionné, VMA, seuil… tous les termes expliqués simplement."
};

/* ------------------------------------------------------------------ */
/*  Reveal : composant utilitaire qui fait apparaître son contenu     */
/*  (fondu + flou + décalage vertical/horizontal/rotation + zoom)     */
/*  dès qu'il entre dans le viewport, via IntersectionObserver.       */
/*  Easing "expo-out" pour un effet plus dynamique. Respecte          */
/*  prefers-reduced-motion.                                           */
/* ------------------------------------------------------------------ */
function useReduitMouvement() {
    const [reduit, setReduit] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReduit(mq.matches);
        const handler = () => setReduit(mq.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return reduit;
}

interface RevealProps {
    children: ReactNode;
    className?: string;
    /** Décalage en ms avant que l'animation ne démarre (effet cascade) */
    delai?: number;
    /** Direction de départ de l'apparition */
    direction?: "haut" | "bas" | "gauche" | "droite" | "zoom" | "zoomRotate";
    as?: "div" | "section";
    /** Durée de la transition en ms (par défaut 900ms pour un effet plus marqué) */
    duree?: number;
}

const EASE_EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_BACK_OUT = "cubic-bezier(0.34, 1.56, 0.64, 1)";

function Reveal({ children, className = "", delai = 0, direction = "bas", as = "div", duree = 900 }: RevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const reduitMouvement = useReduitMouvement();

    useEffect(() => {
        if (reduitMouvement) {
            setVisible(true);
            return;
        }
        const noeud = ref.current;
        if (!noeud) return;

        const observateur = new IntersectionObserver(
            (entrees) => {
                entrees.forEach((entree) => {
                    if (entree.isIntersecting) {
                        setVisible(true);
                        observateur.unobserve(entree.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
        );

        observateur.observe(noeud);
        return () => observateur.disconnect();
    }, [reduitMouvement]);

    const etatDepart: Record<string, string> = {
        haut: "translate-y-[-48px] scale-[0.94] blur-[6px]",
        bas: "translate-y-[48px] scale-[0.94] blur-[6px]",
        gauche: "translate-x-[-56px] scale-[0.94] blur-[6px]",
        droite: "translate-x-[56px] scale-[0.94] blur-[6px]",
        zoom: "scale-[0.82] blur-[6px]",
        zoomRotate: "scale-[0.85] rotate-[-3deg] blur-[6px]"
    };

    const style: CSSProperties = {
        transitionDelay: visible ? `${delai}ms` : "0ms",
        transitionDuration: `${duree}ms`,
        transitionTimingFunction: direction === "zoom" || direction === "zoomRotate" ? EASE_BACK_OUT : EASE_EXPO_OUT
    };
    const Composant = as;

    return (
        <Composant
            ref={ref as never}
            style={style}
            className={`transform transition-all will-change-transform ${visible
                ? "opacity-100 translate-y-0 translate-x-0 scale-100 rotate-0 blur-0"
                : `opacity-0 ${etatDepart[direction]}`
                } ${className}`}
        >
            {children}
        </Composant>
    );
}

export default function Accueil() {
    const [articles, setArticles] = useState<ArticlePublic[] | null>(null);
    const [courses, setCourses] = useState<Course[] | null>(null);
    const [accueilJSON, setAccueilJSON] = useState<AccueilJSON>(DONNEES_ACCUEIL_PAR_DEFAUT);
    const [heroCharge, setHeroCharge] = useState(false);

    const requete = useRequete();
    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        const raf1 = requestAnimationFrame(() => {
            const raf2 = requestAnimationFrame(() => setHeroCharge(true));

            return () => cancelAnimationFrame(raf2);
        });

        return () => cancelAnimationFrame(raf1);
    }, []);

    useEffect(() => {
        async function chargerPageAccueil() {
            try {
                const texteCacheInitial = await requeteJSON("accueil", (nouvellesDonnees) => {
                    if (nouvellesDonnees) {
                        setAccueilJSON((prev) => ({ ...prev, ...nouvellesDonnees }));
                    }
                });

                if (texteCacheInitial) {
                    setAccueilJSON((prev) => ({ ...prev, ...texteCacheInitial }));
                }

                const [articlesDonnees, coursesDonnees] = await Promise.all([
                    requete({ url: "/articles/recuperer-qlq-articles?nbrArticles=3" }),
                    requete({ url: "/courses/courses-accueil" })
                ]);

                setArticles(articlesDonnees);
                setCourses(coursesDonnees);

            } catch (error) {
                console.error("Erreur lors du chargement :", error);
            }
        }

        chargerPageAccueil();
    }, []);

    return (
        <>
            <SEO
                titre="Running Vincennes Association (RVA) — Club de course à pied à Vincennes"
                description="Rejoignez le club Running Vincennes Association ! Entraînements collectifs de course à pied, tous niveaux, préparation aux courses et convivialité au Bois de Vincennes."
                chemin="/"
            >
                <link rel="preload" as="image" href="/img/banniere.webp" fetchPriority="high" />
            </SEO>

            <div className="font-body text-club-900 conteneurPage">
                {/* HERO */}
                <section className="relative overflow-hidden bg-club-600 sm:h-[623.5px]">
                    {/* halo animé en fond pour donner du mouvement continu au hero */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-club-300/20 blur-3xl animate-[pulse_7s_ease-in-out_infinite_1s]"
                    />

                    <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pt-5 pb-20 sm:py-20 md:grid-cols-2 md:py-28">
                        <div>
                            <span
                                className={`inline-block transform rounded-full bg-club-400/30 px-4 py-1 text-sm font-medium text-club-50 transition-all ease-out ${heroCharge ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-90"
                                    }`}
                                style={{ transitionDuration: "700ms", transitionTimingFunction: EASE_BACK_OUT }}
                            >
                                {accueilJSON.entetePage}{" "}

                                <a href="https://www.athle.fr/clubs/508155"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold underline decoration-club-200 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
                                >
                                    {accueilJSON.texteLien}
                                </a>
                            </span>

                            <h1
                                className={`mt-5 transform font-display text-4xl font-bold leading-tight text-white transition-all ease-out md:text-5xl ${heroCharge ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-10 blur-sm"
                                    }`}
                                style={{ transitionDuration: "900ms", transitionDelay: heroCharge ? "150ms" : "0ms", transitionTimingFunction: EASE_EXPO_OUT }}
                            >
                                RUNNING VINCENNES ASSOCIATION
                            </h1>

                            <p
                                className={`mt-5 max-w-md transform text-base leading-relaxed text-club-100 transition-all ease-out md:text-lg ${heroCharge ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                    }`}
                                style={{ transitionDuration: "900ms", transitionDelay: heroCharge ? "320ms" : "0ms", transitionTimingFunction: EASE_EXPO_OUT }}
                            >
                                {accueilJSON.presentationClub}
                            </p>

                            <div
                                className={`mt-8 flex transform flex-wrap gap-4 transition-all ease-out ${heroCharge ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                    }`}
                                style={{ transitionDuration: "900ms", transitionDelay: heroCharge ? "480ms" : "0ms", transitionTimingFunction: EASE_EXPO_OUT }}
                            >
                                <Link
                                    to="/notre-histoire"
                                    className="relative overflow-hidden rounded-lg bg-accent-500 px-6 py-3 text-base font-medium text-white shadow-accent-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-accent-700 hover:shadow-xl hover:shadow-accent-500/40 active:translate-y-0 active:scale-100"
                                >
                                    En savoir plus sur le club
                                </Link>
                                <Link
                                    to="/contactez-nous"
                                    className="rounded-lg border border-white/40 px-6 py-3 text-base font-medium text-white transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-white/10 hover:border-white/70 active:translate-y-0 active:scale-100"
                                >
                                    Nous contacter
                                </Link>
                            </div>
                        </div>

                        {/* ⚡ IMAGE LCP OPTIMISÉE SANS LAZY LOADING + flottement continu */}
                        <div
                            className={`flex aspect-4/3 transform items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/5 text-center text-white transition-all ease-out ${heroCharge ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-90 rotate-2"
                                }`}
                            style={{ transitionDuration: "1100ms", transitionDelay: heroCharge ? "220ms" : "0ms", transitionTimingFunction: EASE_BACK_OUT }}
                        >
                            <div className={`h-full w-full ${heroCharge ? "animate-[float_5s_ease-in-out_infinite]" : ""}`}>
                                <img
                                    src="/img/banniere.webp"
                                    alt="Photo du groupe Running Vincennes Association"
                                    className="h-full w-full object-cover rounded-2xl transition-transform duration-700 ease-out hover:scale-110"
                                    loading="eager"
                                    fetchPriority="high"
                                    decoding="sync"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ENTRAÎNEMENTS */}
                <section className="mx-auto max-w-6xl px-6 py-16 sm:h-[297.5px]">
                    <Reveal className="grid grid-cols-1 items-center gap-10 md:grid-cols-[auto_1fr] sm:h-[169.5px]" direction="zoom" duree={800}>
                        <div className="mx-auto flex h-32 w-32 shrink-0 items-center justify-center rounded-full border border-club-200 bg-club-50 text-center text-xs text-club-700 transition-all duration-500 ease-out hover:scale-110 hover:rotate-3 hover:shadow-lg hover:shadow-club-200/50 md:mx-0">
                            <ImageCache src="/img/thomas.webp" alt={`Photo de ${accueilJSON.nomCoach}`} className="rounded-full" />
                        </div>
                        <div className="sm:h-[169.5px]">
                            <p className="text-sm font-medium uppercase tracking-wide text-club-400">Notre entraîneur</p>
                            <h2 className="mt-1 font-display text-2xl font-semibold text-club-600">
                                {accueilJSON.nomCoach}
                            </h2>
                            <p className="mt-3 max-w-xl text-sm leading-relaxed text-club-900/80">
                                {accueilJSON.presentationCoach}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <span className="rounded-lg bg-club-50 px-4 py-2 text-sm font-medium text-club-700 transition-all duration-300 hover:scale-105 hover:bg-club-100 hover:-translate-y-0.5">
                                    {accueilJSON.horaireEntrainement1}
                                </span>
                                <span className="rounded-lg bg-club-50 px-4 py-2 text-sm font-medium text-club-700 transition-all duration-300 hover:scale-105 hover:bg-club-100 hover:-translate-y-0.5">
                                    {accueilJSON.horaireEntrainement2}
                                </span>
                            </div>
                        </div>
                    </Reveal>
                </section>

                {/* COURSES */}
                {courses && courses.length > 0 && (
                    <section className="bg-club-50 py-16">
                        <div className="mx-auto max-w-6xl px-6">
                            <Reveal className="flex flex-wrap items-center justify-between gap-4" direction="gauche">
                                <h2 className="mt-1 font-display text-2xl font-semibold text-club-600">Nos dernières courses</h2>
                                <Link to="/calendrier" className="text-sm font-medium text-accent-500 transition-all duration-300 hover:text-accent-700 hover:translate-x-1">
                                    Voir toutes les courses →
                                </Link>
                            </Reveal>
                            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                                {courses.map((course, i) => (
                                    <Reveal key={`${course.nom}-${i}`} direction="zoomRotate" delai={i * 100} duree={700}>
                                        <Link
                                            to="/calendrier"
                                            className="group flex flex-col items-center justify-center rounded-lg border-2 border-club-600 bg-white px-3 py-5 text-center transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-105 hover:rotate-1 hover:shadow-xl hover:shadow-club-600/20 hover:border-accent-500"
                                        >
                                            <span className="font-display text-lg font-bold text-accent-500 transition-transform duration-300 group-hover:scale-125">
                                                {String(i + 1).padStart(2, "0")}
                                            </span>
                                            <span className="mt-2 text-xs font-medium leading-snug text-club-700">{course.nom}</span>
                                            <span className="mt-1 text-[11px] text-club-400">{course.lieu}</span>
                                        </Link>
                                    </Reveal>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* RESSOURCES */}
                <section className={`px-auto py-16 ${(!courses || courses.length === 0) ? "bg-club-50" : ""}`}>
                    <div className="mx-auto max-w-6xl px-6">
                        <Reveal className="flex flex-wrap items-center justify-between gap-4" direction="gauche">
                            <h2 className="mt-1 font-display text-2xl font-semibold text-club-600">Nos ressources d'entraînement</h2>
                            <Link to="/ressources" className="text-sm font-medium text-accent-500 transition-all duration-300 hover:text-accent-700 hover:translate-x-1">
                                Voir toutes les ressources →
                            </Link>
                        </Reveal>

                        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                            <Reveal direction="bas" delai={0}>
                                <Link to="/ressources/vma" className="group block h-full rounded-xl border border-club-100 bg-white p-6 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl hover:shadow-club-300/30 hover:border-accent-300">
                                    <h3 className="font-display text-base font-semibold text-club-700 transition-colors duration-300 group-hover:text-accent-500">{accueilJSON.carte1RessourceEntrainementTitre}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-club-900/75">{accueilJSON.carte1RessourceEntrainementDescription}</p>
                                </Link>
                            </Reveal>
                            <Reveal direction="bas" delai={140}>
                                <Link to="/ressources/plan-entrainement" className="group block h-full rounded-xl border border-club-100 bg-white p-6 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl hover:shadow-club-300/30 hover:border-accent-300">
                                    <h3 className="font-display text-base font-semibold text-club-700 transition-colors duration-300 group-hover:text-accent-500">{accueilJSON.carte2RessourceEntrainementTitre}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-club-900/75">{accueilJSON.carte2RessourceEntrainementDescription}</p>
                                </Link>
                            </Reveal>
                            <Reveal direction="bas" delai={280}>
                                <Link to="/ressources/lexique" className="group block h-full rounded-xl border border-club-100 bg-white p-6 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl hover:shadow-club-300/30 hover:border-accent-300">
                                    <h3 className="font-display text-base font-semibold text-club-700 transition-colors duration-300 group-hover:text-accent-500">{accueilJSON.carte3RessourceEntrainementTitre}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-club-900/75">{accueilJSON.carte3RessourceEntrainementDescription}</p>
                                </Link>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* NEWS */}
                {articles && articles.length > 0 && (
                    <section className={`${(!courses || courses.length === 0) ? "bg-white" : "bg-club-50"} py-16`}>
                        <div className="mx-auto max-w-6xl px-6">
                            <Reveal className="flex flex-wrap items-center justify-between gap-4" direction="gauche">
                                <h2 className="mt-1 font-display text-2xl font-semibold text-club-600">Derniers articles</h2>
                                <Link to="/blog" className="text-sm font-medium text-accent-500 transition-all duration-300 hover:text-accent-700 hover:translate-x-1">
                                    Voir le blog →
                                </Link>
                            </Reveal>

                            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                                {articles.map((news, i) => {
                                    const Icone = ICONE_CATEGORIE[news.categorie];

                                    return (
                                        <Reveal key={news.url || news.titre} direction="bas" delai={i * 140}>
                                            <Link
                                                to={"/article/" + news.url}
                                                className="group block h-full overflow-hidden rounded-xl border border-club-100 bg-white transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.015] hover:shadow-xl hover:shadow-club-300/30"
                                            >
                                                <article>
                                                    <div className="relative h-40 w-full shrink-0 overflow-hidden bg-club-50">
                                                        {news.imageUrl ? (
                                                            <img src={news.imageUrl} alt={news.titre} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-club-300 transition-transform duration-500 group-hover:scale-110">
                                                                {Icone && <Icone size={32} />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-5">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className={`rounded-full ${STYLE_BADGE[news.categorie]} px-3 py-1 font-medium transition-transform duration-300 group-hover:scale-105`}>
                                                                {LABEL_CATEGORIE[news.categorie]}
                                                            </span>
                                                            <span className="text-club-400">
                                                                {new Date(news.datePublication).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                                            </span>
                                                        </div>

                                                        <h3 className="mt-3 font-display text-base font-semibold text-club-700 transition-colors duration-300 group-hover:text-accent-500">{news.titre}</h3>
                                                        {news.description && <p className="mt-2 text-sm leading-relaxed text-club-900/75">{news.description}</p>}
                                                    </div>
                                                </article>
                                            </Link>
                                        </Reveal>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* CTA CONTACT */}
                <section className="relative overflow-hidden bg-club-600 py-14">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/20 blur-3xl animate-[pulse_5s_ease-in-out_infinite]"
                    />
                    <Reveal className="relative mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center" direction="zoomRotate" duree={800}>
                        <h2 className="font-display text-xl font-semibold text-white md:text-2xl">Une question ? Envie de nous rejoindre ?</h2>
                        <Link
                            to="/contactez-nous"
                            className="rounded-lg bg-accent-500 px-6 py-3 text-base font-medium text-white transition-all duration-300 hover:-translate-y-1.5 hover:scale-105 hover:bg-accent-700 hover:shadow-2xl hover:shadow-accent-500/50 active:translate-y-0 active:scale-100"
                        >
                            Nous contacter
                        </Link>
                    </Reveal>
                </section>
            </div>
        </>
    );
}