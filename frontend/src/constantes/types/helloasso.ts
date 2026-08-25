export type FormType = "Membership" | "Event" | "Donation" | "PaymentForm" | "Checkout" | "Shop";
export type FormState = "Public" | "Private" | "Draft" | "Disabled";

export interface HelloAssoForm {
    title: string;
    formSlug: string;
    formType: FormType;
    organizationSlug: string;
    state: FormState;
    currency: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    url: string;
    widgetFullUrl?: string;
    widgetButtonUrl?: string;
    banner?: {
        fileName: string;
        publicUrl: string;
    };
    meta: {
        createdAt: string;
        updatedAt: string;
    };
}

export interface HelloAssoFormsResponse {
    data: HelloAssoForm[];
    pagination: {
        pageSize: number;
        totalCount: number;
        pageIndex: number;
        totalPages: number;
        continuationToken?: string;
    };
}
export interface CustomField {
    id: number;
    label: string;
    type: "TextInput" | "Zipcode" | "Phone" | "File" | "YesNo" | string;
    isRequired: boolean;
    values: string[];
}

export interface Tier {
    id: number;
    label: string;
    description?: string;
    tierType: string;
    price: number; // Montant en centimes
    paymentFrequency: string;
    maxPerUser: number;
    customFields: CustomField[];
}

export interface HelloAssoFormDetail {
    title: string;
    formSlug: string;
    formType: string;
    organizationSlug: string;
    organizationName: string;
    organizationLogo?: string;
    description?: string;
    personalizedMessage?: string;
    activityType?: string;
    startDate?: string;
    endDate?: string;
    tiers: Tier[];
    banner?: {
        publicUrl: string;
    };
    widgetFullUrl?: string;
    widgetButtonUrl?: string;
}

export interface HelloAssoDetailResponse {
    etat: boolean;
    detail: HelloAssoFormDetail;
}

export interface CustomFieldAnswer {
    id: number;
    name: string;
    answer: string;
}

export interface HelloAssoUser {
    firstName: string;
    lastName: string;
    email?: string;
}

export interface HelloAssoItem {
    id: number;
    order: {
        id: number;
        formSlug: string;
    };
    payer: {
        firstName: string;
        lastName: string;
        email: string;
    };
    user: HelloAssoUser;
    type: string;
    name: string; // Ex: Licence FFA Athlé Running
    initialAmount: number; // En centimes
    state: string; // Ex: Processed
    customFields: CustomFieldAnswer[];
    ticketUrl?: string;
    qrCode?: string;
}

export interface HelloAssoItemsResponse {
    etat: boolean;
    reponses: {
        resources: HelloAssoItem[];
        pagination: {
            pageSize: number;
            totalCount: number;
            pageIndex: number;
            totalPages: number;
        };
    };
}
// Formulaires
// constantes/types/formulaire.ts

export type CategorieFormulaire = "adhesion" | "repas_noel" | "textile" | "autre";

export const CATEGORIES_FORMULAIRE: { valeur: CategorieFormulaire; label: string }[] = [
    { valeur: "adhesion", label: "Adhésion" },
    { valeur: "repas_noel", label: "Repas de Noël" },
    { valeur: "textile", label: "Textile" },
    { valeur: "autre", label: "Autre" },
];

export type TypeChampFormulaire = "texte" | "nombre" | "telephone" | "email" | "choix_unique" | "choix_multiple" | "case_a_cocher";

export const TYPES_CHAMP_FORMULAIRE: { valeur: TypeChampFormulaire; label: string }[] = [
    { valeur: "texte", label: "Texte libre" },
    { valeur: "nombre", label: "Nombre" },
    { valeur: "telephone", label: "Téléphone" },
    { valeur: "email", label: "Email" },
    { valeur: "choix_unique", label: "Choix unique" },
    { valeur: "choix_multiple", label: "Choix multiple" },
    { valeur: "case_a_cocher", label: "Case à cocher" },
];

/** Un champ nécessite une liste d'options à définir. */
export function champAvecOptions(type: TypeChampFormulaire): boolean {
    return type === "choix_unique" || type === "choix_multiple";
}

export interface ChampFormulaire {
    id: string;
    label: string;
    type: TypeChampFormulaire;
    obligatoire: boolean;
    options?: string[];
}

export interface ImageCouvertureFormulaire {
    chemin: string;
    alt: string;
}

export interface FormulaireHelloAsso {
    id?: number;
    nom: string;
    categorie: CategorieFormulaire;
    description?: string;
    image?: ImageCouvertureFormulaire | null;
    champs: ChampFormulaire[];
    /** Slug HelloAsso associé, si le formulaire correspond à un formulaire existant côté HelloAsso. */
    slugHelloasso?: string;
    formTypeHelloasso?: string;
}
