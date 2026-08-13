import { DataTypes } from "sequelize";

export default function (bdd) {
    const Articles = bdd.define(
        "Articles",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            type: {
                type: DataTypes.ENUM("brouillon", "publie", "suggestion"),
                allowNull: false,
            },

            titre: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
            },
            description: {
                type: DataTypes.STRING(200),
                allowNull: false,
            },
            categorie: {
                type: DataTypes.ENUM(
                    "actu_publique",
                    "actu_interne",
                    "newsletter",
                    "recommandation",
                    "solde"
                ),
                allowNull: false,
            },

            url: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },

            imageUrl: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            contenuHtml: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            datePublication: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            tableName: "Articles",
            timestamps: false,
        },
    );

    return Articles;
}