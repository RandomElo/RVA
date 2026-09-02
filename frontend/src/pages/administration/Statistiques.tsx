import { useEffect, useState, lazy, Suspense } from "react";
import type { DonneesDashboardStatistiques } from "../../constantes/types/statistiques";
import {
    Mail,
    Newspaper,
    ArrowUpRight,
    type LucideIcon,
    BookOpenText,
} from "lucide-react";
import { useRequete, type Requete } from "../../fonctions/requete";
import { Link } from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationsContext";

const GraphiqueEvolutionMensuelle = lazy(() =>
    import("../../composants/administration/StatistiquesCharts").then((m) => ({
        default: m.GraphiqueEvolutionMensuelle,
    }))
);
const GraphiqueAdherentsVisiteursParMois = lazy(() =>
    import("../../composants/administration/StatistiquesCharts").then((m) => ({
        default: m.GraphiqueAdherentsVisiteursParMois,
    }))
);
const GraphiqueRepartitionPie = lazy(() =>
    import("../../composants/administration/StatistiquesCharts").then((m) => ({
        default: m.GraphiqueRepartitionPie,
    }))
);

async function recupererStatistiquesAdmin(
    requete: Requete,
    periode: { debut: string; fin: string }
) {
    return await requete({
        url:
            "/statistiques/recuperation?debut=" +
            periode.debut +
            "&fin=" +
            periode.fin,
    });
}

const titreNewsletter = (url: string) => {
    const slug = url.split("/").pop() ?? "";
    const match = slug.match(/^newsletter-(.+)-(\d{4})$/);

    if (!match) return slug;

    const mois: Record<string, string> = {
        janvier: "Janvier",
        fevrier: "Février",
        mars: "Mars",
        avril: "Avril",
        mai: "Mai",
        juin: "Juin",
        juillet: "Juillet",
        aout: "Août",
        septembre: "Septembre",
        octobre: "Octobre",
        novembre: "Novembre",
        decembre: "Décembre",
    };

    return `Newsletter ${mois[match[1]] ?? match[1]} ${match[2]}`;
};

function CarteChiffreCle({
    libelle,
    valeur,
    className = "",
}: {
    libelle: string;
    valeur: number | string;
    className?: string;
}) {
    return (
        <div
            className={
                "rounded-xl border border-club-100 bg-white p-5 shadow-sm " + className
            }
        >
            <p className="font-body text-sm text-club-700">{libelle}</p>
            <p className="font-display mt-1 text-3xl font-semibold text-club-900">
                {valeur}
            </p>
        </div>
    );
}

function CarteListe({
    titre,
    icone: Icone,
    couleur = "club",
    items,
    unite,
    lien,
}: {
    titre: string;
    icone: LucideIcon;
    couleur?: "club" | "accent";
    items: { label: string; valeur: number }[];
    unite?: string;
    lien: (index: number) => string;
}) {
    const styles =
        couleur === "accent"
            ? { badge: "bg-accent-100 text-accent-600", rang: "bg-accent-50 text-accent-600" }
            : { badge: "bg-club-100 text-club-600", rang: "bg-club-50 text-club-600" };

    return (
        <div className="flex h-full flex-col rounded-xl border border-club-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.badge}`}
                >
                    <Icone size={18} />
                </span>
                <h2 className="font-display text-lg font-semibold text-club-900">
                    {titre}
                </h2>
            </div>

            <ul className="flex-1 space-y-1.5 overflow-y-auto">
                {items.map((item, index) => (
                    <li key={index}>
                        <Link
                            to={lien(index)}
                            className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-club-50"
                        >
                            <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${styles.rang}`}
                            >
                                {index + 1}
                            </span>
                            <span className="flex-1 truncate font-body text-sm text-club-800">
                                {item.label}
                            </span>
                            <span className="shrink-0 font-body text-sm font-semibold text-club-900">
                                {item.valeur}
                                {unite ? ` ${unite}` : ""}
                            </span>
                            <ArrowUpRight
                                size={16}
                                className="shrink-0 text-club-400 opacity-0 transition group-hover:opacity-100"
                            />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function BlocChargement() {
    return (
        <div className="flex h-64 items-center justify-center font-body text-club-700">
            Chargement des statistiques…
        </div>
    );
}

function BlocErreur({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-accent-300 bg-accent-100 p-4 font-body text-accent-700">
            {message}
        </div>
    );
}

function BlocChargementGraphique() {
    return (
        <div className="flex h-60 items-center justify-center rounded-xl border border-club-100 bg-white font-body text-sm text-club-500">
            Chargement du graphique…
        </div>
    );
}

export default function Statistiques() {
    const [donnees, setDonnees] = useState<DonneesDashboardStatistiques | null>(null);
    const [enChargement, setEnChargement] = useState<boolean>(true);
    const [erreur, setErreur] = useState<string | null>(null);

    // Date
    const ilYAUnMois = new Date();
    ilYAUnMois.setMonth(ilYAUnMois.getMonth() - 1);
    const [periode, setPeriode] = useState({
        debut: ilYAUnMois.toISOString().split("T")[0],
        fin: new Date().toISOString().split("T")[0],
    });

    const requete = useRequete();
    const { notifier } = useNotifications();

    useEffect(() => {
        document.title = "Statistiques - Running Vincennes Association";
    }, []);

    useEffect(() => {
        let ignorer = false;
        setEnChargement(true);
        setErreur(null);

        recupererStatistiquesAdmin(requete, periode)
            .then((resultat) => {
                if (!ignorer) {
                    setDonnees(resultat);
                }
            })
            .catch(() => {
                if (!ignorer)
                    setErreur("Impossible de charger les statistiques pour le moment.");
            })
            .finally(() => {
                if (!ignorer) setEnChargement(false);
            });

        return () => {
            ignorer = true;
        };
    }, [periode.debut, periode.fin]);

    async function handleEnvoyerRecap() {
        try {
            const reponse = await requete({
                url: "/statistiques/mail",
                methode: "POST",
                corps: { debut: periode.debut, fin: periode.fin },
            });
            notifier({ type: "succes", titre: "Succès", description: reponse });
        } catch {
            notifier({
                type: "erreur",
                titre: "Erreur",
                description: "Impossible d'envoyer le récapitulatif par mail.",
            });
        }
    }

    return (
        <div className="conteneurPage mx-auto max-w-6xl px-4 py-8">
            <div className="mb-3">
                <Link
                    to="/administration"
                    className="font-body text-sm text-club-600 hover:text-club-700"
                >
                    ← Interface administration
                </Link>
            </div>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="font-display text-2xl font-semibold text-club-900">
                    Statistiques du site
                </h1>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                        <label className="font-body text-sm text-club-700 flex items-center gap-2">
                            Du
                            <input
                                type="date"
                                className="inputStyle"
                                value={periode.debut}
                                onChange={(e) =>
                                    setPeriode((p) => ({ ...p, debut: e.target.value }))
                                }
                            />
                        </label>
                        <label className="font-body text-sm text-club-700 flex items-center gap-2">
                            Au
                            <input
                                type="date"
                                className="inputStyle"
                                value={periode.fin}
                                onChange={(e) =>
                                    setPeriode((p) => ({ ...p, fin: e.target.value }))
                                }
                            />
                        </label>
                    </div>

                    <button
                        onClick={handleEnvoyerRecap}
                        className="flex items-center gap-2 rounded-lg bg-club-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-club-700"
                    >
                        <Mail size={16} />
                        Envoyer le récap par mail
                    </button>
                </div>
            </div>

            {erreur && <BlocErreur message={erreur} />}
            {enChargement && <BlocChargement />}

            {!enChargement && donnees && (
                <>
                    {/* Chiffres clés */}
                    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <CarteChiffreCle
                            libelle="Vues de pages"
                            valeur={donnees.chiffresCles.totalVuesPage}
                        />
                        <CarteChiffreCle
                            libelle="Part adhérents / visiteurs"
                            valeur={`${donnees.chiffresCles.repartitionVisiteurAdherent.adherent} / ${donnees.chiffresCles.repartitionVisiteurAdherent.visiteur}`}
                        />
                    </div>

                    {/* Graphiques + Cartes */}
                    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="flex flex-col gap-6">
                            <Suspense fallback={<BlocChargementGraphique />}>
                                <GraphiqueEvolutionMensuelle donnees={donnees} />
                            </Suspense>
                            <Suspense fallback={<BlocChargementGraphique />}>
                                <GraphiqueAdherentsVisiteursParMois donnees={donnees} />
                            </Suspense>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="flex-1">
                                <CarteListe
                                    titre="Pages les plus vues"
                                    icone={BookOpenText}
                                    couleur="club"
                                    items={donnees.topPages.map((a) => ({
                                        label: a.page,
                                        valeur: a.vues,
                                    }))}
                                    unite="vues"
                                    lien={(index: number) => donnees.topPages[index].page}
                                />
                            </div>

                            <div className="flex-1">
                                <CarteListe
                                    titre="Articles les plus lus"
                                    icone={Newspaper}
                                    couleur="accent"
                                    items={donnees.topArticles.map((a) => ({
                                        label: a.page,
                                        valeur: a.vues,
                                    }))}
                                    unite="vues"
                                    lien={(index: number) => donnees.topArticles[index].page}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Répartition visiteur / adhérent */}
                        <Suspense fallback={<BlocChargementGraphique />}>
                            <GraphiqueRepartitionPie donnees={donnees} />
                        </Suspense>

                        <div className="flex-1">
                            <CarteListe
                                titre="Dernières newsletters"
                                icone={Mail}
                                couleur="club"
                                items={donnees.topNewsletters.map((n) => ({
                                    label: titreNewsletter(n.page),
                                    valeur: n.vues,
                                }))}
                                unite="vues"
                                lien={(index: number) => donnees.topNewsletters[index].page}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}