export interface RepartitionVisiteurAdherent {
    visiteur: number;
    adherent: number;
}

export interface ChiffresCles {
    totalVuesPage: number;
    repartitionVisiteurAdherent: RepartitionVisiteurAdherent;
}

export interface Statistique {
    page: string;
    vues: number;
}
export interface PointEvolutionMensuelle {
    mois: string; // format "YYYY-MM"
    vues: number;
    clics: number;
}

export interface DonneesDashboardStatistiques {
    chiffresCles: ChiffresCles;
    topPages: Statistique[];
    topArticles: Statistique[];
    topNewsletters: Statistique[];
    evolutionMensuelle: PointEvolutionMensuelle[];
    adherentsVisiteursParMois: { mois: "Jan" | "Fév" | "Mar" | "Avr" | "Mai" | "Juin" | "Juil" | "Août" | "Sep" | "Oct" | "Nov" | "Déc"; adherents: number; visiteurs: number }[];
}
