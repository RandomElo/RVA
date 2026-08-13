import { DataTypes } from "sequelize";

export default function (bdd) {
    const Specialistes = bdd.define(
        "Specialistes",
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

            specialite: {
                type: DataTypes.ENUM(
                    "kine_sport",
                    "kine",
                    "podologue",
                    "osteopathe",
                    "medecin_sport"
                ),
                allowNull: false,
            },

            detail: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            adresse: {
                type: DataTypes.STRING(500),
                allowNull: false,
            },

            telephone: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            lienReservation: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },
        },
        {
            tableName: "Specialistes",
            timestamps: false,
        },
    );

    return Specialistes;
}