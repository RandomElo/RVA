import { DataTypes } from "sequelize";

export default function (bdd) {
    const AdherentsCourse = bdd.define(
        "AdherentsCourse",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            idAdherent: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "Utilisateurs",
                    key: "id",
                },
            },

            idCourse: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "Courses",
                    key: "id",
                },
            },

            statut: {
                type: DataTypes.ENUM("interesse", "participe"),
                allowNull: true,
            },
        },
        {
            tableName: "AdherentsCourse",
            timestamps: false,
            indexes: [
                {
                    unique: true,
                    fields: ["idAdherent", "idCourse"],
                },
            ],
        },
    );

    return AdherentsCourse;
}