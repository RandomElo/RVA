import { DataTypes } from "sequelize";

export default function (bdd) {
    const Tokens = bdd.define(
        "Tokens",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            token: {
                type: DataTypes.STRING(10),
                allowNull: false,
                unique: true,
                validate: {
                    is: /^[A-Za-z0-9]{1,10}$/,
                },
            },
            type: {
                type: DataTypes.ENUM("lienConnexion", "codeConnexion", "lienDesinscriptionNewsletter"),
                allowNull: false,
            },
            details: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: {},
            },
            dateExpiration: {
                type: DataTypes.DATE,
                allowNull: true
            }
        },
        {
            tableName: "Tokens",
            timestamps: true,
            createdAt: "dateCreation",
            updatedAt: false,
        },
    );
    return Tokens;
}
