/**
 * Page : politique de confidentialité (RGPD).
 *
 * ⚠️ Contenu à faire relire/compléter avant publication : les champs marqués
 * [À COMPLÉTER] doivent être remplis avec les vraies informations. Ce n'est pas un
 * conseil juridique — en cas de doute, faites valider par une personne qualifiée
 * (la CNIL propose des modèles et un guide pour les associations).
 *
 * Prérequis : aucun (page statique). Route suggérée : /politique-confidentialite
 */

import { Link } from "react-router-dom";
import Section from "../../composants/Section";
import { useEffect, useState } from "react";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import SEO from "../../composants/generale/SEO";

const DONNEES_POLITIQUES_CONFIDENTIALITE_PAR_DEFAUT = {
    titre: "Politique de confidentialité",
    dateDerniereMiseAJour: "Dernière mise à jour : 30 juillet 2026",

    introParagraphe: "Cette politique explique quelles données personnelles nous collectons sur ce site, pourquoi, et comment vous pouvez exercer vos droits, conformément au Règlement Général sur la Protection des Données (RGPD).",

    section1Titre: "1. Responsable du traitement",
    section1Paragraphe1: "Running Vincennes Association attache une importance particulière à la protection des données personnelles de ses adhérents et des utilisateurs de son site internet.",
    section1Paragraphe2: "La présente politique a pour objet d’expliquer quelles données sont collectées, pour quelles finalités, pendant combien de temps elles sont conservées et quels sont vos droits.",

    section2Titre: "2. Responsable de traitement",
    section2Intro: "Le responsable du traitement est :",
    section2Nom: "Running Vincennes Association",
    section2Adresse1: "28 bis rue de l’Église",
    section2Adresse2: "94300 Vincennes",
    section2Representation: "L’association est représentée par son Président.",
    section2ContactLabel: "Pour toute question relative aux données personnelles :",
    section2ContactBouton: "Contactez-nous",

    section3Titre: "3. Données collectées",
    section3Intro: "Selon votre utilisation du Site, nous pouvons être amenés à traiter :",
    section3Li1: "nom",
    section3Li2: "prénom",
    section3Li3: "adresse électronique",
    section3Li4: "photographies publiées avec votre autorisation",
    section3Li5: "identifiants de connexion",
    section3Li6: "journaux techniques nécessaires à la sécurité du Site (adresse IP, ...)",
    section3Paragraphe2: "Aucune donnée de santé n’est collectée par le Site.",

    section4Titre: "4. Finalités",
    section4Intro: "Ces données sont utilisées exclusivement afin de :",
    section4Li1: "gérer les comptes adhérents ;",
    section4Li2: "assurer le fonctionnement du Site ;",
    section4Li3: "communiquer avec les adhérents ;",
    section4Li4: "publier les informations relatives à la vie associative ;",
    section4Li5: "assurer la sécurité informatique du Site.",

    section5Titre: "5. Base juridique",
    section5Intro: "Les traitements reposent selon les cas sur :",
    section5Li1: "l’exécution de la relation associative ;",
    section5Li2: "le consentement (notamment pour les photographies) ;",
    section5Li3: "l’intérêt légitime de l’association pour assurer le fonctionnement et la sécurité du Site.",

    section6Titre: "6. Destinataires",
    section6Intro: "Les données sont accessibles uniquement :",
    section6Li1: "aux membres habilités du bureau ;",
    section6Li2: "aux administrateurs du Site lorsque cela est nécessaire à leurs missions ;",
    section6Li3: "à l’hébergeur OVH dans le cadre de sa prestation technique.",
    section6Paragraphe2: "Aucune donnée n’est vendue ou cédée à des tiers.",

    section7Titre: "7. Durée de conservation",
    section7Paragraphe1: "Les données sont conservées pendant la durée de l’adhésion.",
    section7Paragraphe2: "Elles peuvent être conservées plus longtemps lorsque la loi l’impose ou lorsqu’elles sont nécessaires à la défense des droits de l’association.",

    section8Titre: "8. Sécurité",
    section8Paragraphe1: "L’association met en œuvre des mesures techniques et organisationnelles destinées à assurer la confidentialité, l’intégrité et la sécurité des données personnelles.",

    section9Titre: "9. Cookies",
    section9Paragraphe1: "Le Site utilise uniquement les cookies strictement nécessaires à son fonctionnement.",
    section9Paragraphe2: "Il utilise également un outil interne de mesure d’audience respectueux de la vie privée, ne reposant ni sur des cookies ni sur l’identification des utilisateurs, mais uniquement sur le type d'utilisateur (visiteur ou adhérent).",

    section10Titre: "10. Vos droits",
    section10Intro: "Conformément au RGPD, vous disposez notamment des droits suivants :",
    section10Li1: "accès ;",
    section10Li2: "rectification ;",
    section10Li3: "effacement ;",
    section10Li4: "limitation ;",
    section10Li5: "opposition ;",
    section10Li6: "portabilité lorsque la réglementation le prévoit.",
    section10Paragraphe2Avant: "Vous pouvez exercer ces droits à tout moment via le",
    section10Paragraphe2Lien: "formulaire de contact",
    section10Paragraphe2Apres: "ou par courrier électronique.",
    section10Paragraphe3: "Vous pouvez également introduire une réclamation auprès de la CNIL.",

    section11Titre: "11. Mineurs",
    section11Paragraphe1: "Lorsque le compte concerne un adhérent mineur, les traitements réalisés dans le cadre du Site interviennent sous la responsabilité de son représentant légal.",

    section12Titre: "12. Modification de la politique",
    section12Paragraphe1: "La présente politique peut être modifiée afin de tenir compte des évolutions législatives ou du fonctionnement du Site.",

    finParagraphe: "La version applicable est celle publiée en ligne"

}

export default function PolitiqueConfidentialite() {
    const [textes, setTextes] = useState(DONNEES_POLITIQUES_CONFIDENTIALITE_PAR_DEFAUT)

    const requeteJSON = useRequeteJSON()

    useEffect(() => {
        async function recuperation() {
            const donnees = await requeteJSON("politique-confidentialite", (nouvellesDonnees) => { if (nouvellesDonnees) setTextes(nouvellesDonnees) })
            if (donnees) setTextes(donnees)
        }
        recuperation()
    }, []);

    return (
        <>
            <SEO
                titre="Politique de Confidentialité — Running Vincennes Association"
                description="Information sur le traitement et la protection de vos données personnelles collectées sur le site Running Vincennes (conformité RGPD)."
                chemin="/politique-confidentialite"
            />

            <div className="mx-auto max-w-2xl px-6 py-12">
                <header className="mb-8">
                    <h1 className="font-display text-3xl font-bold text-[#040F33]">{textes.titre}</h1>
                    <p className="mt-2 text-sm text-[#0B2270]/60">{textes.dateDerniereMiseAJour}</p>
                </header>

                <div className="flex flex-col gap-8 text-sm leading-relaxed text-[#0B2270]/80">
                    <p>{textes.introParagraphe}</p>

                    <Section titre={textes.section1Titre}>
                        <p>{textes.section1Paragraphe1}</p>
                        <p>{textes.section1Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section2Titre}>
                        <p>{textes.section2Intro}</p>
                        <p className="font-bold">{textes.section2Nom}</p>
                        <p>{textes.section2Adresse1}</p>
                        <p>{textes.section2Adresse2}</p>
                        <p>{textes.section2Representation}</p>
                        <p className="leading-relaxed">
                            {textes.section2ContactLabel}{" "}
                            <Link to="/contactez-nous"
                                className="font-medium text-accent-600 underline underline-offset-2 transition hover:text-accent-800">
                                {textes.section2ContactBouton}
                            </Link>
                        </p>
                    </Section>

                    <Section titre={textes.section3Titre}>
                        <p>{textes.section3Intro}</p>
                        <ul className="list-disc pl-3">
                            <li>{textes.section3Li1}</li>
                            <li>{textes.section3Li2}</li>
                            <li>{textes.section3Li3}</li>
                            <li>{textes.section3Li4}</li>
                            <li>{textes.section3Li5}</li>
                            <li>{textes.section3Li6}</li>
                        </ul>
                        <p>{textes.section3Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section4Titre}>
                        <p>{textes.section4Intro}</p>
                        <ul className="list-disc pl-3">
                            <li>{textes.section4Li1}</li>
                            <li>{textes.section4Li2}</li>
                            <li>{textes.section4Li3}</li>
                            <li>{textes.section4Li4}</li>
                            <li>{textes.section4Li5}</li>
                        </ul>
                    </Section>

                    <Section titre={textes.section5Titre}>
                        <p>{textes.section5Intro}</p>
                        <ul className="list-disc pl-3">
                            <li>{textes.section5Li1}</li>
                            <li>{textes.section5Li2}</li>
                            <li>{textes.section5Li3}</li>
                        </ul>
                    </Section>

                    <Section titre={textes.section6Titre}>
                        <p>{textes.section6Intro}</p>
                        <ul className="list-disc pl-3">
                            <li>{textes.section6Li1}</li>
                            <li>{textes.section6Li2}</li>
                            <li>{textes.section6Li3}</li>
                        </ul>
                        <p>{textes.section6Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section7Titre}>
                        <p>{textes.section7Paragraphe1}</p>
                        <p>{textes.section7Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section8Titre}>
                        <p>{textes.section8Paragraphe1}</p>
                    </Section>

                    <Section titre={textes.section9Titre}>
                        <p>{textes.section9Paragraphe1}</p>
                        <p>{textes.section9Paragraphe2}</p>
                        <p></p>
                    </Section>

                    <Section titre={textes.section10Titre}>
                        <p>{textes.section10Intro}</p>
                        <ul className="list-disc pl-3">
                            <li>{textes.section10Li1}</li>
                            <li>{textes.section10Li2}</li>
                            <li>{textes.section10Li3}</li>
                            <li>{textes.section10Li4}</li>
                            <li>{textes.section10Li5}</li>
                            <li>{textes.section10Li6}</li>
                        </ul>
                        <p className="leading-relaxed">
                            {textes.section10Paragraphe2Avant}{" "}
                            <Link to="/contactez-nous"
                                className="font-medium text-accent-600 underline underline-offset-2 transition hover:text-accent-800">

                                {textes.section10Paragraphe2Lien}
                            </Link>{" "}
                            {textes.section10Paragraphe2Apres}
                        </p>
                        <p>{textes.section10Paragraphe3}</p>
                    </Section>

                    <Section titre={textes.section11Titre}>
                        <p>{textes.section11Paragraphe1}</p>
                    </Section>

                    <Section titre={textes.section12Titre}>
                        <p>{textes.section12Paragraphe1}</p>
                    </Section>
                    <p>{textes.finParagraphe}</p>

                </div>
            </div>
        </>
    );
}