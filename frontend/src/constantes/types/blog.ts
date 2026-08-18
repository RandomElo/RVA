import { Newspaper, Headphones, Lock, Euro, ScrollText, Book, CircleQuestionMark } from "lucide-react";
export type Categorie = "actu_publique" | "recommandation" | "actu_interne" | "solde" | "newsletter" | "album_photo" | "tuto";

export const LABEL_CATEGORIE: Record<Categorie, string> = {
    actu_publique: "Actu club",
    recommandation: "Recommandation",
    actu_interne: "Actu interne",
    solde: "Solde",
    newsletter: "Newsletter",
    album_photo: "Album photo",
    tuto: "Tutoriel",
};
export const STYLE_BADGE: Record<Categorie, string> = {
    actu_publique: "bg-club-100 text-club-800",
    recommandation: "bg-accent-100 text-accent-800",
    actu_interne: "bg-violet-100 text-violet-800",
    solde: "bg-rose-100 text-rose-800",
    newsletter: "bg-indigo-100 text-indigo-800",
    album_photo: "bg-amber-100 text-amber-800",
    tuto: "bg-sky-100 text-sky-800",
};
export const ICONE_CATEGORIE: Record<Categorie, typeof Newspaper> = {
    actu_publique: Newspaper,
    recommandation: Headphones,
    actu_interne: Lock,
    solde: Euro,
    newsletter: ScrollText,
    album_photo: Book,
    tuto: CircleQuestionMark,
};
export const ONGLETS: { value: Categorie | "tous"; label: string }[] = [
    { value: "tous", label: "Tous" },
    { value: "actu_publique", label: "Actu club" },
    { value: "actu_interne", label: "Actu interne" },
    { value: "newsletter", label: "Newsletter" },
    { value: "album_photo", label: "Album photo" },
    { value: "recommandation", label: "Recommandations" },
    { value: "solde", label: "Solde" },
    { value: "tuto", label: "Tutoriel" },
];
export type ArticleFormValue = {
    id?: string;
    titre: string;
    categorie: Categorie;
    url: string;
    description: string;
    imageUrl?: string;
    urlCanva?: string;
    contenuHtml: string;
    datePublication: string; // format yyyy-mm-dd
    dansNavigation: boolean;
};
export type ArticlePublic = {
    titre: string;
    categorie: Categorie;
    imageUrl?: string;
    url: string;
    description?: string;
    datePublication: string; // yyyy-mm-dd
};
export type ImageSite = {
    alt: string;
    nomFichier: string;
    type?: "systeme" | "galerie";
};
export interface PhotoAlbum {
    chemin: string;
    legende: string;
}
