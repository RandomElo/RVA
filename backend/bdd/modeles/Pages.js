import { DataTypes } from "sequelize";

export default function (bdd) {
    const Pages = bdd.define(
        "Pages",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            titre: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
            },

            url: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },

            modifiable: {
                type: DataTypes.BOOLEAN,
                default: true,
                allowNull: false,
            },

            dansNavigation: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
            },

            contenuHtml: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

        },
        {
            tableName: "Pages",
            timestamps: false,
        },
    );

    return Pages;
}