/**
 * Page d'accueil de l'espace administrateur.
 *
 * Cette page ne permet aucune modification elle-même : c'est un tableau
 * de bord qui sert de point d'entrée vers les pages où l'admin effectue
 * réellement les actions (créer une news, ajouter une course, etc.).
 *
 * Prérequis dans le projet :
 * 1. Créer les routes enfants correspondantes : /administration/actualites,
 *    /administration/courses, /administration/adherents, /administration/outils (adapter les
 *    chemins si vos routes portent d'autres noms).
 * 2. Endpoint optionnel /administration/stats côté backend pour les chiffres clés
 *    (nb adhérents, nb news publiées, invitations en attente, prochaine
 *    course). Tant qu'il n'existe pas, les cartes affichent "…".
 * 3. Cette page doit elle-même être protégée par la vérification
 *    "compte marqué administrateur" (cf. §3.4 du cahier des charges) —
 *    à faire au niveau du routeur ou d'un composant de garde, pas ici.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRequete } from "../../fonctions/requete";
import { Newspaper, CalendarDays, Users, ArrowRight, ShieldCheck, ChartLine, BookOpenText, Stethoscope, Image, NotebookPen, Loader2, HandCoins } from "lucide-react";

interface Stats {
    nbrAdherents: number;
    nbrArticles: number;
    invitationsEnAttente: number;
    prochaineCourse: { nom: string, date: string };
    nbrCoursesSuggestion: number;
    nbrArticlesSuggestion: number;
}

interface SectionAdmin {
    titre: string;
    description: string;
    url: string;
    icone: typeof Newspaper;
}

const SECTIONS: SectionAdmin[] = [
    {
        titre: "Blog",
        description: "Publier une actu club, une recommandation ou une news réservée aux membres.",
        url: "/administration/blog",
        icone: Newspaper,
    },
    {
        titre: "Rédiger un article",
        description: "Ajouter une recommandation, une actu, une newsletter au blog.",
        url: "/rediger-article",
        icone: NotebookPen,
    },
    {
        titre: "Courses",
        description: "Ajouter ou modifier une course : date, lieu, lien du groupe WhatsApp.",
        url: "/administration/courses",
        icone: CalendarDays,
    },
    {
        titre: "Adhérents",
        description: "Gérer la liste blanche des e-mails, envoyer les invitations de connexion et mettre à jour le trombinoscope.",
        url: "/administration/adherents",
        icone: Users,
    },
    {
        titre: "Pages",
        description: "Créer, modifier et personnaliser le contenu texte des pages en toute simplicité.",
        url: "/administration/pages",
        icone: BookOpenText,
    },
    {
        titre: "Images",
        description: "Modifiez les images directement présentes dans les pages sans passer par le code, ajoutez de nouvelles photos.",
        url: "/administration/images",
        icone: Image,
    },
    {
        titre: "Spécialistes de santé",
        description: "Référencer les kinés, podologues, ostéopathes et médecins du sport, avec leurs coordonnées.",
        url: "/administration/specialistes-sante",
        icone: Stethoscope,
    }, 
    {
        titre: "HelloAsso",
        description: "Gérer les adhésions, suivre les paiements, formulaires et cotisations du club.",
        url: "/administration/helloasso",
        icone: HandCoins,
    },
    {
        titre: "Statistiques",
        description: "Consultez les statistiques de fréquentation et l'activité des utilisateurs sur le site internet.",
        url: "/administration/statistiques",
        icone: ChartLine,
    },
];

export default function AdminAccueil() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [chargementPage, setChargementPage] = useState<string>("")

    const requete = useRequete();

    useEffect(() => {
        document.title = "Administration - Running Vincennes Association";

        async function recupererStats() {
            const reponse = await requete({ url: "/autres/details-interface-administration" })
            setStats(reponse)
        }
        recupererStats();
    }, []);

    return (
        <div className="font-body text-club-900 conteneurPage">
            {/* EN-TÊTE */}
            <section className="bg-club-600">
                <div className="mx-auto max-w-6xl px-6 py-12">
                    <span className="inline-flex items-center gap-2 rounded-full bg-club-400/30 px-4 py-1 text-sm font-medium text-club-50">
                        <ShieldCheck size={16} />
                        Espace administrateur
                    </span>
                    <h1 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">Tableau de bord</h1>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-club-100 md:text-base">Retrouvez ici tout ce qu'il faut pour gérer le site : blog, courses, adhérents et outils. Choisissez une section ci-dessous pour commencer.</p>
                </div>
            </section>

            {/* CHIFFRES CLÉS */}
            <section className="mx-auto max-w-6xl px-6 py-10">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <CarteChiffre label="Adhérents" valeur={stats?.nbrAdherents} />
                    <CarteChiffre label="News publiées" valeur={stats?.nbrArticles} />
                    <CarteChiffre label="Invitations en attente" valeur={stats?.invitationsEnAttente} />
                    <CarteChiffre label="Prochaine course" valeur={stats?.prochaineCourse ? stats.prochaineCourse.nom : "—"} />
                    <CarteChiffre label="Articles en attente" valeur={stats?.nbrArticlesSuggestion} classname="md:col-start-2" />
                    <CarteChiffre label="Courses en attente" valeur={stats?.nbrCoursesSuggestion} />

                </div>
            </section>

            {/* SECTIONS DE GESTION */}
            <section className="mx-auto max-w-6xl px-6 pb-16">
                <h2 className="font-display text-xl font-semibold text-club-600">Gérer le site</h2>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {SECTIONS.map((section) => {
                        const Icone = section.icone;
                        return (
                            <Link key={section.url} to={section.url}

                                onClick={() => setChargementPage(section.url)}
                                className="group flex items-start gap-4 rounded-xl border border-club-100 bg-white p-6 transition-shadow hover:shadow-lg">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-club-50 text-club-600 transition-colors group-hover:bg-club-600 group-hover:text-white">
                                    {chargementPage == section.url ? <Loader2 className="animate-spin" /> : <Icone size={22} />}

                                </div>
                                <div className="flex-1">
                                    <h3 className="font-display text-base font-semibold text-club-700">{section.titre}</h3>
                                    <p className="mt-1 text-sm leading-relaxed text-club-900/75">{section.description}</p>
                                </div>
                                <ArrowRight size={18} className="mt-1 shrink-0 text-club-300 transition-transform group-hover:translate-x-1 group-hover:text-accent-500" />
                            </Link>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function CarteChiffre({ label, valeur, classname }: { label: string; valeur?: number | string, classname?: string }) {
    return (
        <div className={`rounded-xl border border-club-100 bg-white p-5 ${classname ?? ''}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-club-400">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-club-600">{valeur === undefined ? "…" : valeur}</p>
        </div>
    );
}
