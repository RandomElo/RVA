import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Sector,
    DefaultLegendContent,
} from "recharts";
import type { DonneesDashboardStatistiques } from "../../constantes/types/statistiques";

const COULEUR_VUES = "#0F2C8F"; // club-600
const COULEURS_REPARTITION = ["#4574D2", "#EE8659"]; // adherent / visiteur

const formaterMois = (mois: string) => {
    const [annee, numeroMois] = mois.split("-");

    const resultat = new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
    }).format(new Date(Number(annee), Number(numeroMois) - 1));

    return resultat.charAt(0).toUpperCase() + resultat.slice(1);
};

export function GraphiqueEvolutionMensuelle({
    donnees,
}: {
    donnees: DonneesDashboardStatistiques;
}) {
    return (
        <div className="rounded-xl border border-club-100 bg-white p-5 shadow-sm">
            <h2 className="font-display mb-4 text-lg font-semibold text-club-900">
                Évolution mensuelle
            </h2>
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={donnees.evolutionMensuelle}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAF0FB" />
                    <XAxis
                        dataKey="mois"
                        tick={{ fontSize: 12 }}
                        tickFormatter={formaterMois}
                    />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip labelFormatter={(mois) => formaterMois(String(mois))} />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="clics"
                        name="Vues de pages"
                        stroke={COULEUR_VUES}
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function GraphiqueAdherentsVisiteursParMois({
    donnees,
}: {
    donnees: DonneesDashboardStatistiques;
}) {
    return (
        <div className="rounded-xl border border-club-100 bg-white p-5 shadow-sm">
            <h2 className="font-display mb-4 text-lg font-semibold text-club-900">
                Adhérents vs visiteurs par mois
            </h2>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={donnees.adherentsVisiteursParMois}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAF0FB" />
                    <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                        dataKey="adherents"
                        name="Adhérents"
                        stackId="repartition"
                        fill={COULEURS_REPARTITION[0]}
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="visiteurs"
                        name="Visiteurs"
                        stackId="repartition"
                        fill={COULEURS_REPARTITION[1]}
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function GraphiqueRepartitionPie({
    donnees,
}: {
    donnees: DonneesDashboardStatistiques;
}) {
    const repartition = [
        {
            nom: "Adhérents",
            valeur: donnees.chiffresCles.repartitionVisiteurAdherent.adherent,
        },
        {
            nom: "Visiteurs",
            valeur: donnees.chiffresCles.repartitionVisiteurAdherent.visiteur,
        },
    ];

    return (
        <div className="rounded-xl border border-club-100 bg-white p-5 shadow-sm">
            <h2 className="font-display mb-4 text-lg font-semibold text-club-900">
                Adhérents vs visiteurs
            </h2>
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={repartition}
                        dataKey="valeur"
                        nameKey="nom"
                        innerRadius={60}
                        outerRadius={90}
                        shape={(props: any) => (
                            <Sector
                                {...props}
                                fill={
                                    COULEURS_REPARTITION[
                                    props.index % COULEURS_REPARTITION.length
                                    ]
                                }
                            />
                        )}
                    />
                    <Tooltip
                        content={({ active, payload: tooltipPayload, ...props }: any) => {
                            const activeIndex =
                                props.activeIndex != null ? Number(props.activeIndex) : -1;
                            const entry = activeIndex !== -1 ? repartition[activeIndex] : null;
                            if (!active || !entry) return null;
                            return (
                                <div className="rounded-lg border border-club-100 bg-white px-3 py-2 text-sm shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    COULEURS_REPARTITION[
                                                    activeIndex % COULEURS_REPARTITION.length
                                                    ],
                                            }}
                                        />
                                        <span>{entry.nom}</span>
                                    </div>
                                    <span className="font-semibold">{entry.valeur}</span>
                                </div>
                            );
                        }}
                    />
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        content={(props: any) => {
                            const legendPayload = repartition.map((entry, index) => ({
                                color: COULEURS_REPARTITION[index % COULEURS_REPARTITION.length],
                                payload: entry,
                                type: props.iconType,
                                value: entry.nom,
                            }));
                            return <DefaultLegendContent {...props} payload={legendPayload} />;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}