import { DataTypes } from "sequelize";
import jwt from "jsonwebtoken";

export default function (bdd) {
    const Utilisateurs = bdd.define(
        "Utilisateurs",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            prenom: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            dateNaissance: {
                type: DataTypes.STRING(5),
                allowNull: false,
                validate: {
                    is: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/
                }
            },
            nom: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            mail: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true,
                },
            },
            motDePasse: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            role: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "adherent",
                validate: {
                    isIn: [["adherent", "administrateur"]],
                },
            },
            cheminTrombinoscope: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            derniereConnexion: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            recevoirNewsletter: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false,
            }
        },
        {
            tableName: "Utilisateurs",
            timestamps: true,
            createdAt: "dateCreation",
            updatedAt: false,
        },
    );
    Utilisateurs.generationToken = async function (req, res, utilisateur, objetRetour) {
        try {
            if (!process.env.CHAINE_JWT_COOKIE) {
                throw new Error("JWT_SECRET non défini");
            }

            await req.Utilisateurs.update({ derniereConnexion: new Date() }, { where: { id: utilisateur.id } });

            const tokenJWT = jwt.sign({ id: utilisateur.id }, process.env.CHAINE_JWT_COOKIE, {
                expiresIn: "3d",
            });
            return res
                .cookie("utilisateur", tokenJWT, {
                    maxAge: 3 * 24 * 60 * 60 * 1000,
                    httpOnly: true,
                    sameSite: "Strict",
                    secure: process.env.MODE == "production",
                })
                .json(objetRetour);
        } catch (erreur) {
            console.log(erreur);
            await req.Erreur.create({
                emplacement: "generationCookie",
                detail: JSON.stringify({ nom: erreur.name, message: erreur.message, stack: erreur.stack }),
            });
            return res.json({ etat: false, detail: "Erreur lors de la génération du cookie d'authentification" });
        }
    };
    return Utilisateurs;
}
