import { DataTypes } from "sequelize";

export default function (bdd) {
    const Courses = bdd.define(
        "Courses",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            etat: {
                type: DataTypes.ENUM("suggestion", "valider"),
                allowNull: false,
            },

            nom: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },

            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },

            lieu: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            distance: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            type: {
                type: DataTypes.ENUM(
                    "5km",
                    "10km",
                    "Semi",
                    "Marathon",
                    "Route",
                    "Trail"
                ),
                allowNull: false,
            },

            lienWhatsapp: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            lienSite: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            lienInscription: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            inscriptionsOuvertes: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            dateOuvertureInscription: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
        },
        {
            tableName: "Courses",
            timestamps: false,
        },
    );

    return Courses;
}