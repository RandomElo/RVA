import { type ReactNode } from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
    titre: string;
    description: string;
    chemin: string;
    image?: string;
    children?: ReactNode;
    noindex?: boolean; // pour les pages légales (CGU, mentions légales, etc.)
}

const nomDomaine = import.meta.env.VITE_NOM_DOMAINE;
const IMAGE_PAR_DEFAUT = `https://${nomDomaine}/img/banniere-1600.webp`;
const LOGO = `https://${nomDomaine}/img/logo.png`;

const NOM_DU_SITE = "Running Vincennes Association";
const URL_RACINE = `https://${nomDomaine}/`;

// Vos profils sociaux réels — à compléter
const RESEAUX_SOCIAUX = [
    "https://www.instagram.com/runningvincennesasso/",
    "https://www.strava.com/clubs/174006",
    "https://www.facebook.com/profile.php?id=100027790136650",
];

export default function SEO({ titre, description, chemin, image, children, noindex }: SEOProps) {
    const url = `https://${nomDomaine}${chemin}`;

    const imageUrlAbsolue = image
        ? (image.startsWith("http") ? image : `https://${nomDomaine}${image}`)
        : IMAGE_PAR_DEFAUT;

    // Schéma WebSite : identité globale du site pour Google
    const schemaWebSite = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${URL_RACINE}#website`,
        "name": NOM_DU_SITE,
        "alternateName": ["RVA", "Running Vincennes"],
        "url": URL_RACINE,
        "inLanguage": "fr-FR",
        "publisher": {
            "@id": `${URL_RACINE}#organisation`
        }
    };

    // Schéma SportsClub : renforce le référencement local
    // ("course à pied Vincennes", "club running Vincennes", etc.)
    const schemaSportsClub = {
        "@context": "https://schema.org",
        "@type": "SportsClub",
        "@id": `${URL_RACINE}#organisation`,
        "name": NOM_DU_SITE,
        "alternateName": ["RVA", "Running Vincennes"],
        "url": URL_RACINE,
        "logo": LOGO,
        "image": IMAGE_PAR_DEFAUT,
        "description": "Club de course à pied à Vincennes proposant des entraînements collectifs tous niveaux, dans le Bois de Vincennes.",
        "sport": "Course à pied",
        "areaServed": {
            "@type": "City",
            "name": "Vincennes"
        },
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Vincennes",
            "postalCode": "94300",
            "addressRegion": "Île-de-France",
            "addressCountry": "FR"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 48.844428,
            "longitude": 2.439115
        },
        "sameAs": RESEAUX_SOCIAUX
    };

    return (
        <Helmet>
            {/* Balises principales */}
            <title>{titre}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            {noindex && <meta name="robots" content="noindex, follow" />}

            {/* Balises Open Graph */}
            <meta property="og:site_name" content={NOM_DU_SITE} />
            <meta property="og:title" content={titre} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content="website" />
            <meta property="og:image" content={imageUrlAbsolue} />
            <meta property="og:locale" content="fr_FR" />

            {/* Balises Twitter / X */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={titre} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrlAbsolue} />

            {/* Données structurées : identité du site + organisation locale */}
            <script type="application/ld+json">
                {JSON.stringify(schemaWebSite)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(schemaSportsClub)}
            </script>

            {children}
        </Helmet>
    );
}