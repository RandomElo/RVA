export interface Partenaire {
    image: string;
    nom: string;
    description: string;
    lien: string;
}
export interface PartenaireValide {
    nom: string;
    lien: string;
    image?: string;
    description?: string;
}
export interface StructureJSONPartenaires {
    titre: string;
    description: string;
    [key: string]: string | undefined;
}
