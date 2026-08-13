import { DataTypes } from "sequelize";

/**
 * Une ligne = un événement (vue de page ou clic sur un lien externe)
 * pour un jour donné, agrégé directement au niveau jour via un compteur.
 *
 * Exemple concret :
 *   { typeEvenement: "vue_page", cible: "/calendrier", typePersonne: "adherent", date: "2026-08-01", compteur: 12 }
 *   { typeEvenement: "clic_lien", cible: "https://chat.whatsapp.com/xxxx", typePersonne: "visiteur", date: "2026-08-01", compteur: 3 }
 *
 * On ne stocke jamais un événement "brut" par requête : à chaque nouvel
 * événement on incrémente la ligne du jour correspondante (voir
 * services/statistiqueService.js -> enregistrerEvenement).
 * L'agrégation mensuelle affichée dans le dashboard admin est calculée
 * à la volée à partir de ces lignes journalières (SUM ... GROUP BY mois).
 */
export default function (bdd) {
    const Statistique = bdd.define(
        "Statistique",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            // Chemin de page (ex: "/calendrier") ou URL du lien externe cliqué
            cible: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            typePersonne: {
                type: DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    isIn: [["visiteur", "adherent"]],
                },
            },
            // Granularité jour (pas d'heure) : une ligne par jour max pour un même triplet
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            compteur: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
        },
        {
            tableName: "Statistiques",
            timestamps: true,
            createdAt: "dateCreation",
            updatedAt: "derniereMiseAJour",
            indexes: [
                {
                    // Un seul enregistrement possible par jour/évènement/cible/type de personne
                    // -> permet l'upsert incrémental (voir enregistrerEvenement)
                    unique: true,
                    fields: [ "cible", "typePersonne", "date"],
                    name: "index_unique_evenement_jour",
                },
                {
                    // Accélère les requêtes d'agrégation du dashboard admin
                    fields: ["date"],
                },
            ],
        },
    );

    return Statistique;
}