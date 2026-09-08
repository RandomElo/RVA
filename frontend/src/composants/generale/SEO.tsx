import { type ReactNode } from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
    titre: string;
    description: string;
    chemin: string;
    image?: string;
    children?: ReactNode;
}

const nomDomaine = import.meta.env.VITE_NOM_DOMAINE;
const IMAGE_PAR_DEFAUT = `https://${nomDomaine}/img/banniere-1600.webp`;

const NOM_DU_SITE = "Running Vincennes Association";

export default function SEO({ titre, description, chemin, image, children }: SEOProps) {
    const url = `https://${nomDomaine}${chemin}`;

    const imageUrlAbsolue = image
        ? (image.startsWith("http") ? image : `https://${nomDomaine}${image}`)
        : IMAGE_PAR_DEFAUT;

    // Données structurées JSON-LD pour indiquer explicitement le nom du site à Google
    const schemaWebSite = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": NOM_DU_SITE,
        "alternateName": ["RVA", "Running Vincennes"],
        "url": `https://${nomDomaine}/`
    };

    return (
        <Helmet>
            {/* Balises principales */}
            <title>{titre}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            {/* Balises Open Graph */}
            <meta property="og:site_name" content={NOM_DU_SITE} />
            <meta property="og:title" content={titre} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content="website" />
            <meta property="og:image" content={imageUrlAbsolue} />

            {/* Balises Twitter / X */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={titre} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrlAbsolue} />

            {/* Données structurées pour le nom du site (Google Site Name) */}
            <script type="application/ld+json">
                {JSON.stringify(schemaWebSite)}
            </script>

            {children}
        </Helmet>
    );
}