import { DataTypes } from "sequelize";

export default function (bdd) {
    const Images = bdd.define(
        "Images",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            alt: {
                type: DataTypes.STRING(200),
                allowNull: false,
            },
            nomFichier: {
                type: DataTypes.STRING(200),
                allowNull: false,
                unique: true,
            },
            type: {
                type: DataTypes.ENUM("systeme", "galerie"),
                allowNull: false,
            }
        },
        {
            tableName: "Images",
            timestamps: false,
        },
    );

    return Images;
}