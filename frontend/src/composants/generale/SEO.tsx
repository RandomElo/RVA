import { type ReactNode } from "react";
import { Helmet } from "react-helmet-async"; // ou "react-helmet" selon votre setup

interface SEOProps {
    titre: string;
    description: string;
    chemin: string;
    image?: string; // Prop optionnelle pour l'URL de l'image
    children?: ReactNode;
}

const nomDomaine = import.meta.env.VITE_NOM_DOMAINE

// Image par défaut si l'article n'en possède pas
const IMAGE_PAR_DEFAUT = `https://${nomDomaine}/img/banniere-1600.webp`;

export default function SEO({ titre, description, chemin, image, children }: SEOProps) {
    const url = `https://${nomDomaine}${chemin}`;

    // Si l'image est un chemin relatif (ex: /uploads/img.jpg), on le transforme en URL absolue
    const imageUrlAbsolue = image
        ? (image.startsWith("http") ? image : `https://${nomDomaine}${image}`)
        : IMAGE_PAR_DEFAUT;

    return (
        <Helmet>
            {/* Balises principales */}
            <title>{titre}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            {/* Balises Open Graph (Facebook, LinkedIn, Discord, WhatsApp...) */}
            <meta property="og:title" content={titre} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content="article" />
            <meta property="og:image" content={imageUrlAbsolue} />

            {/* Balises Twitter / X */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={titre} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrlAbsolue} />

            {children}
        </Helmet>
    );
}