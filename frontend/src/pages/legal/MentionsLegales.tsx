/**
 * Page : mentions légales.
 *
 * ⚠️ Contenu à faire relire/compléter avant publication : les champs marqués
 * [À COMPLÉTER] doivent être remplis avec les vraies informations de l'association
 * (SIRET, adresse du siège, nom de l'hébergeur exact, etc.). Ce n'est pas un
 * conseil juridique — en cas de doute, faites valider par une personne qualifiée.
 *
 * Prérequis : aucun (page statique). Route suggérée : /mentions-legales
 */
const DONNEES_PAR_DEFAULT = {
    titre: "Mentions légales",
    dateDerniereMiseAJour: "Dernière mise à jour : 04 août 2026",

    section1Titre: "1. Éditeur du site",
    section1Intro: "Le présent site est édité par :",
    section1NomAssociation: "RUNNING VINCENNES ASSOCIATION (RVA)",
    section1Statut: "Association régie par la loi du 1er juillet 1901.",
    section1Siege: "Siège social : 28 bis rue de l’Église 94300 Vincennes",
    section1Rna: "RNA : W942005217",
    section1Siret: "SIRET : 511 609 422 00023",
    section1DirecteurLabel: "Directeur de la publication : ",
    section1DirecteurNom: "Jean-Philippe Pegard",
    section1DirecteurFonction: ", Président de l’association.",
    section1ContactAvant: "Pour toute question relative au fonctionnement du site ou à la protection des données personnelles, vous pouvez contacter l’association via le",
    section1ContactLien: "formulaire de contact",
    section1ContactApres: "accessible sur le Site.",

    section2Titre: "2. Hébergement",
    section2Intro: "Le Site est hébergé par :",
    section2Nom: "OVH SAS (OVHcloud)",
    section2Adresse1: "2 rue Kellermann",
    section2Adresse2: "59100 Roubaix – France",
    section2Telephone: "Téléphone : +33 9 72 10 10 07",
    section2SiteWebUrl: "https://www.ovhcloud.com",
    section2SiteWebLabel: "https://www.ovhcloud.com",

    section3Titre: "3. Propriété intellectuelle",
    section3Paragraphe1: "L’ensemble des éléments composant le Site, notamment les textes, photographies, illustrations, logos, graphismes, vidéos, documents, ainsi que sa structure générale, sont protégés par le Code de la propriété intellectuelle.",
    section3Paragraphe2: "Sauf autorisation écrite préalable de l’association ou des titulaires des droits concernés, toute reproduction, représentation, adaptation, diffusion ou exploitation, totale ou partielle, est interdite.",
    section3Paragraphe3: "Les marques, logos et contenus appartenant à des tiers demeurent la propriété exclusive de leurs titulaires.",

    section4Titre: "4. Responsabilité",
    section4Paragraphe1: "L’association s’efforce d’assurer l’exactitude et la mise à jour des informations publiées sur le Site. Toutefois, elle ne peut garantir l’absence d’erreurs ou d’omissions ni être tenue responsable des conséquences pouvant résulter de l’utilisation des informations diffusées.",
    section4Paragraphe2: "Les informations relatives aux courses, calendriers, résultats ou événements sont données à titre indicatif. Il appartient à chaque utilisateur de vérifier les informations officielles auprès des organisateurs concernés.",

    section5Titre: "5. Liens hypertextes",
    section5Paragraphe1: "Le Site peut contenir des liens vers des sites internet exploités par des tiers.",
    section5Paragraphe2: "L’association n’exerce aucun contrôle sur ces sites et ne saurait être tenue responsable de leur contenu, de leur disponibilité ou de leurs pratiques en matière de protection des données.",

    section6Titre: "6. Protection des données personnelles",
    section6Paragraphe1: "Dans le cadre du fonctionnement du Site, l’association est amenée à collecter et traiter certaines données à caractère personnel, notamment pour la gestion des comptes adhérents, la communication avec les membres, l’administration du Site et l’organisation de la vie associative.",
    section6Paragraphe2: "L’association s’engage à traiter ces données dans le respect du Règlement (UE) 2016/679 du 27 avril 2016 (RGPD) et de la loi n° 78-17 du 6 janvier 1978 modifiée dite « Informatique et Libertés », en veillant au respect des principes de licéité, de transparence, de minimisation des données et de sécurité.",
    section6Paragraphe3: "Les modalités de collecte, les finalités des traitements, les destinataires des données, leur durée de conservation ainsi que les droits des personnes concernées (accès, rectification, effacement, limitation, opposition et, le cas échéant, portabilité) sont détaillés dans la Politique de confidentialité, accessible à tout moment depuis le pied de page du Site.",
    section6Paragraphe4: "Toute demande relative aux données personnelles peut être adressée à l’association via le formulaire de contact du Site ou à l’adresse électronique dédiée mentionnée dans les présentes mentions légales.",

    section7Titre: "7. Cookies",
    section7Paragraphe1: "Le Site utilise uniquement les cookies strictement nécessaires à son fonctionnement ainsi qu’un outil interne de mesure d’audience respectueux de la vie privée, ne reposant ni sur des cookies ni sur l’identification des utilisateurs, mais uniquement sur le type d'utilisateur (visiteur ou adhérent).",
    section7Paragraphe2: "Pour plus d’informations, l’utilisateur est invité à consulter la Politique de confidentialité.",

    section8Titre: "8. Crédits",
    section8Paragraphe1: "Les photographies, illustrations, pictogrammes, polices de caractères, bibliothèques logicielles et autres éléments graphiques utilisés sur le Site sont reproduits avec l’autorisation de leurs auteurs ou conformément aux licences applicables.",
    section8AvantLien: "Les crédits détaillés figurent sur la page",
    section8Lien: "Crédits",
    section8ApresLien: "du Site.",

    section9Titre: "9. Droit applicable",
    section9Paragraphe1: "Le présent Site, ses mentions légales ainsi que les documents qui lui sont associés (notamment les Conditions Générales d’Utilisation et la Politique de confidentialité) sont régis par le droit français.",
    section9Paragraphe2: "En cas de difficulté ou de litige relatif à l’utilisation du Site, les parties s’efforceront de rechercher, dans un premier temps, une solution amiable.",
    section9Paragraphe3: "À défaut d’accord amiable, le litige sera porté devant les juridictions françaises territorialement compétentes, conformément aux règles de compétence applicables."

}
import { Link } from "react-router-dom";
import Section from "../../composants/Section";
import { useEffect, useState } from "react";
import { useRequeteJSON } from "../../fonctions/requeteJSON";
import SEO from "../../composants/generale/SEO";

export default function MentionsLegales() {
    const [textes, setTextes] = useState<any>(DONNEES_PAR_DEFAULT)

    const requeteJSON = useRequeteJSON()
    useEffect(() => {
        async function recuperation() {
            const donnees = await requeteJSON("mentions-legales", (nouvellesDonnees) => {
                if (nouvellesDonnees) setTextes(nouvellesDonnees)
            })
            if (donnees) setTextes(donnees)
        }
        recuperation()
    }, []);

    return (
        <>
            <SEO
                titre="Mentions Légales — Running Vincennes Association"
                description="Consultez les mentions légales et informations éditoriales relatives au site officiel du club de course à pied Running Vincennes Association."
                chemin="/mentions-legales"
            />
            <div className="mx-auto max-w-2xl px-6 py-12">
                <header className="mb-8">
                    <h1 className="font-display text-3xl font-bold text-[#040F33]">{textes.titre}</h1>
                    <p className="mt-2 text-sm text-[#0B2270]/60">{textes.dateDerniereMiseAJour}</p>
                </header>

                <div className="flex flex-col gap-8 text-sm leading-relaxed text-[#0B2270]/80">
                    <Section titre={textes.section1Titre}>
                        <p>{textes.section1Intro}</p>
                        <p className="font-bold">{textes.section1NomAssociation}</p>
                        <p>{textes.section1Statut}</p>
                        <p>{textes.section1Siege}</p>
                        <p>{textes.section1Rna}</p>
                        <p>{textes.section1Siret}</p>
                        <p>
                            {textes.section1DirecteurLabel}
                            <span className="font-bold">{textes.section1DirecteurNom}</span>
                            {textes.section1DirecteurFonction}
                        </p>

                        <p className="leading-relaxed">
                            {textes.section1ContactAvant}{" "}
                            <Link
                                to="/contactez-nous"
                                className="font-medium text-accent-600 underline underline-offset-2 transition hover:text-accent-800">

                                {textes.section1ContactLien}
                            </Link>{" "}
                            {textes.section1ContactApres}
                        </p>
                    </Section>

                    <Section titre={textes.section2Titre}>
                        <p>{textes.section2Intro}</p>
                        <p className="font-bold">{textes.section2Nom}</p>
                        <p>{textes.section2Adresse1}</p>
                        <p>{textes.section2Adresse2}</p>
                        <p>{textes.section2Telephone}</p>
                        <Link to={textes.section2SiteWebUrl} className="underline text-blue-700">
                            {textes.section2SiteWebLabel}
                        </Link>
                        <p></p>
                    </Section>

                    <Section titre={textes.section3Titre}>
                        <p>{textes.section3Paragraphe1}</p>
                        <p>{textes.section3Paragraphe2}</p>
                        <p>{textes.section3Paragraphe3}</p>
                    </Section>

                    <Section titre={textes.section4Titre}>
                        <p>{textes.section4Paragraphe1}</p>
                        <p>{textes.section4Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section5Titre}>
                        <p>{textes.section5Paragraphe1}</p>
                        <p>{textes.section5Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section6Titre}>
                        <p>{textes.section6Paragraphe1}</p>
                        <p>{textes.section6Paragraphe2}</p>
                        <p>{textes.section6Paragraphe3}</p>
                        <p>{textes.section6Paragraphe4}</p>
                    </Section>

                    <Section titre={textes.section7Titre}>
                        <p>{textes.section7Paragraphe1}</p>
                        <p>{textes.section7Paragraphe2}</p>
                    </Section>

                    <Section titre={textes.section8Titre}>
                        <p>{textes.section8Paragraphe1}</p>
                        <p>
                            {textes.section8AvantLien}{" "}
                            <Link
                                to="/credits"
                                className="font-medium text-accent-600 underline underline-offset-2 transition hover:text-accent-800">

                                {textes.section8Lien}
                            </Link>{" "}
                            {textes.section8ApresLien}
                        </p>
                    </Section>

                    <Section titre={textes.section9Titre}>
                        <p>{textes.section9Paragraphe1}</p>
                        <p>{textes.section9Paragraphe2}</p>
                        <p>{textes.section9Paragraphe3}</p>
                    </Section>
                </div>
            </div >
        </>
    );
}