import { DataTypes } from "sequelize";
import jwt from "jsonwebtoken";
import { REGEX_DATE_NAISSANCE } from "../../fonctions/utilitaires/validation.js";

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
            // Jour et mois uniquement ("JJ/MM", sans année) : sert aux anniversaires, pas au calcul d'un âge
            dateNaissance: {
                type: DataTypes.STRING(5),
                allowNull: false,
                validate: {
                    is: REGEX_DATE_NAISSANCE
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
            },
            // Identifiant Google (sub) lié au compte administrateur lors de sa première connexion Google
            googleId: {
                type: DataTypes.STRING(255),
                allowNull: true,
                unique: true,
            }
        },
        {
            tableName: "Utilisateurs",
            timestamps: true,
            createdAt: "dateCreation",
            updatedAt: false,
        },
    );
    // Met à jour la date de dernière connexion et renvoie le jeton JWT de session.
    // La pose du cookie et la réponse HTTP restent côté contrôleur (rmc/controleurs/auth/session.js).
    Utilisateurs.genererTokenSession = async function (utilisateur) {
        if (!process.env.CHAINE_JWT_COOKIE) {
            throw new Error("JWT_SECRET non défini");
        }

        await Utilisateurs.update({ derniereConnexion: new Date() }, { where: { id: utilisateur.id } });

        return jwt.sign({ id: utilisateur.id }, process.env.CHAINE_JWT_COOKIE, {
            expiresIn: "3d",
        });
    };
    return Utilisateurs;
}
