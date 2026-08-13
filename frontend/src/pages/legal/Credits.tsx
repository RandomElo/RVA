import { useEffect, useState } from "react";
import Section from "../../composants/Section";
import PuceLicense from "../../composants/credits/PuceLicense";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import SEO from "../../composants/generale/SEO";

const DONNEES_CREDITS_PAR_DEFAUT = {
    titre: "Crédits",
    dateDerniereMiseAJour: "Dernière mise à jour : 30 juillet 2026",

    introParagraphe:
        "Le site internet de Running Vincennes Association (RVA) est le fruit d'un projet conçu et réalisé bénévolement au service des adhérents de l'association.",

    section1Titre: "1. Conception et réalisation",
    section1DeveloppementLabel: "Développement :",
    section1DeveloppementNom: "Éloi Bontron",
    section1RedactionLabel: "Rédaction juridique :",
    section1RedactionNom: "Sabine Sultan",
    section1DirectionLabel: "Direction de publication :",
    section1DirectionNom: "Jean-Philippe Pegard, Président de Running Vincennes Association",

    section2Titre: "2. Hébergement",
    section2Intro: "Le Site est hébergé par :",
    section2Nom: "OVH SAS (OVHcloud)",

    section3Titre: "3. Ressources techniques",
    section3Paragraphe1:
        "Le Site s'appuie sur différentes technologies et ressources logicielles distribuées sous leurs licences respectives.",

    licence1Lien: "https://github.com/react/react/blob/main/LICENSE",
    licence1Texte: "React",
    licence1Description: "bibliothèque JavaScript pour la création de l'interface utilisateur",

    licence2Lien: "https://github.com/expressjs/express/blob/master/LICENSE",
    licence2Texte: "Express.js",
    licence2Description: "serveur utilisé pour les services backend",

    licence3Lien: "https://lucide.dev/license",
    licence3Texte: "Lucide Icons",
    licence3Description: "bibliothèque d'icônes vectorielles",

    licence4Lien: "https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE",
    licence4Texte: "Tailwind CSS",
    licence4Description: "framework CSS utilitaire",

    licence5Lien: "https://opensource.org/license/postgresql",
    licence5Texte: "PostgreSQL",
    licence5Description: "système de gestion de base de données",

    licence6Lien: "https://github.com/vitejs/vite/blob/main/LICENSE",
    licence6Texte: "Vite",
    licence6Description: "outil de développement et de génération du projet frontend",

    licence7Lien: "https://github.com/remix-run/react-router/blob/main/LICENSE.md",
    licence7Texte: "React Router",
    licence7Description: "bibliothèque de gestion de la navigation",

    licence8Lien: "https://github.com/sequelize/sequelize/blob/main/LICENSE",
    licence8Texte: "Sequelize",
    licence8Description: "ORM pour l'accès à la base de données",

    licence9Lien: "https://github.com/expressjs/multer/blob/master/LICENSE",
    licence9Texte: "Multer",
    licence9Description: "middleware de gestion des téléversements de fichiers",

    licence10Lien: "https://github.com/node-fetch/node-fetch/blob/main/LICENSE.md",
    licence10Texte: "node-fetch",
    licence10Description: "bibliothèque permettant d'effectuer des requêtes HTTP côté serveur",

    section3Paragraphe2:
        "Ces ressources restent la propriété de leurs auteurs respectifs et sont utilisées conformément aux conditions de leurs licences.",

    section4Titre: "4. Ressources graphiques",
    section4Paragraphe1:
        "Les photographies, illustrations, pictogrammes, polices de caractères et autres ressources graphiques utilisées sur le Site sont exploités conformément à leurs licences respectives ou avec l'autorisation de leurs auteurs.",
    section4Paragraphe2: "Les crédits spécifiques sont mentionnés lorsque cela est requis.",

    section5Titre: "5. Remerciements",
    section5Paragraphe1:
        "Running Vincennes Association remercie l'ensemble des bénévoles ayant contribué à la réalisation, à l'amélioration et à la maintenance du Site.",
};

type CreditsDonnees = typeof DONNEES_CREDITS_PAR_DEFAUT;

export default function Credits() {
    const [textes, setTextes] = useState<CreditsDonnees>(DONNEES_CREDITS_PAR_DEFAUT);
    const requeteJSON = useRequeteJSON();

    useEffect(() => {
        async function recuperation() {
            try {
                const donnees = await requeteJSON("credits", (nouvellesDonnees) => {
                    if (nouvellesDonnees) setTextes(nouvellesDonnees);
                });
                if (donnees) {
                    setTextes(donnees);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des crédits :", error);
            }
        }
        recuperation();
    }, []);

    return (
        <>
            <SEO
                titre={`${textes.titre} — Running Vincennes Association`}
                description="Remerciements et crédits pour les photographies, icônes et composants techniques utilisés sur le site de Running Vincennes Association."
                chemin="/credits"
            />
            <main className="mx-auto max-w-2xl px-6 py-12">
                <header className="mb-8">
                    <h1 className="font-display text-3xl font-bold text-[#040F33]">{textes.titre}</h1>
                    <p className="mt-2 text-sm text-[#0B2270]/60">{textes.dateDerniereMiseAJour}</p>
                </header>

                <div className="flex flex-col gap-8 text-sm leading-relaxed text-[#0B2270]/80">
                    <p>{textes.introParagraphe}</p>

                    <Section titre={textes.section1Titre}>
                        <p>
                            <strong>{textes.section1DeveloppementLabel}</strong>
                        </p>
                        <p>{textes.section1DeveloppementNom}</p>

                        <p className="mt-4">
                            <strong>{textes.section1RedactionLabel}</strong>
                        </p>
                        <p>{textes.section1RedactionNom}</p>

                        <p className="mt-4">
                            <strong>{textes.section1DirectionLabel}</strong>
                        </p>
                        <p>{textes.section1DirectionNom}</p>
                    </Section>

                    <Section titre={textes.section2Titre}>
                        <p>{textes.section2Intro}</p>
                        <p className="font-bold">{textes.section2Nom}</p>
                    </Section>

                    <Section titre={textes.section3Titre}>
                        <p>{textes.section3Paragraphe1}</p>

                        <ul className="list-disc pl-4">
                            <PuceLicense
                                lien={textes.licence1Lien}
                                texte={textes.licence1Texte}
                                description={textes.licence1Description}
                            />
                            <PuceLicense
                                lien={textes.licence2Lien}
                                texte={textes.licence2Texte}
                                description={textes.licence2Description}
                            />
                            <PuceLicense
                                lien={textes.licence3Lien}
                                texte={textes.licence3Texte}
                                description={textes.licence3Description}
                            />
                            <PuceLicense
                                lien={textes.licence4Lien}
                                texte={textes.licence4Texte}
                                description={textes.licence4Description}
                            />
                            <PuceLicense
                                lien={textes.licence5Lien}
                                texte={textes.licence5Texte}
                                description={textes.licence5Description}
                            />
                            <PuceLicense
                                lien={textes.licence6Lien}
                                texte={textes.licence6Texte}
                                description={textes.licence6Description}
                            />
                            <PuceLicense
                                lien={textes.licence7Lien}
                                texte={textes.licence7Texte}
                                description={textes.licence7Description}
                            />
                            <PuceLicense
                                lien={textes.licence8Lien}
                                texte={textes.licence8Texte}
                                description={textes.licence8Description}
                            />
                            <PuceLicense
                                lien={textes.licence9Lien}
                                texte={textes.licence9Texte}
                                description={textes.licence9Description}
                            />
                            <PuceLicense
                                lien={textes.licence10Lien}
                                texte={textes.licence10Texte}
                                description={textes.licence10Description}
                            />
                        </ul>

                        <p className="mt-4">{textes.section3Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section4Titre}>
                        <p>{textes.section4Paragraphe1}</p>
                        <p>{textes.section4Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section5Titre}>
                        <p>{textes.section5Paragraphe1}</p>
                    </Section>
                </div>
            </main>
        </>
    );
}