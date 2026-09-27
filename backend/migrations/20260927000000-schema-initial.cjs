"use strict";

// Schéma initial : reproduit exactement les tables créées jusqu'ici par sequelize.sync()
// à partir des modèles de bdd/modeles (types, contraintes, index, clés étrangères).
// Une base déjà créée par sync() doit être marquée comme migrée (voir README.md) au lieu d'exécuter ce fichier.

const TYPES_ENUM = [
    "enum_AdherentsCourse_statut",
    "enum_Articles_categorie",
    "enum_Articles_type",
    "enum_Courses_etat",
    "enum_Courses_type",
    "enum_Images_type",
    "enum_Specialistes_etat",
    "enum_Specialistes_specialite",
    "enum_Tokens_type",
];

// Clé primaire auto-incrémentée commune à toutes les tables
function cleId(Sequelize) {
    return {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    };
}

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.createTable(
                "Utilisateurs",
                {
                    id: cleId(Sequelize),
                    prenom: { type: Sequelize.STRING(100), allowNull: false },
                    dateNaissance: { type: Sequelize.STRING(5), allowNull: false },
                    nom: { type: Sequelize.STRING(100), allowNull: false },
                    mail: { type: Sequelize.STRING(255), allowNull: false, unique: true },
                    motDePasse: { type: Sequelize.STRING(255), allowNull: true },
                    role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "adherent" },
                    cheminTrombinoscope: { type: Sequelize.STRING(255), allowNull: true },
                    derniereConnexion: { type: Sequelize.DATE, allowNull: true },
                    recevoirNewsletter: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
                    dateCreation: { type: Sequelize.DATE, allowNull: false },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "Tokens",
                {
                    id: cleId(Sequelize),
                    token: { type: Sequelize.STRING(10), allowNull: false, unique: true },
                    type: {
                        type: Sequelize.ENUM("lienConnexion", "codeConnexion", "lienDesinscriptionNewsletter"),
                        allowNull: false,
                    },
                    details: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
                    dateExpiration: { type: Sequelize.DATE, allowNull: true },
                    dateCreation: { type: Sequelize.DATE, allowNull: false },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "Articles",
                {
                    id: cleId(Sequelize),
                    type: { type: Sequelize.ENUM("brouillon", "publie", "suggestion"), allowNull: false },
                    titre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
                    description: { type: Sequelize.STRING(200), allowNull: false },
                    categorie: {
                        type: Sequelize.ENUM(
                            "actu_publique",
                            "actu_interne",
                            "newsletter",
                            "recommandation",
                            "solde",
                            "album_photo",
                            "tuto",
                        ),
                        allowNull: false,
                    },
                    url: { type: Sequelize.STRING(255), allowNull: false, unique: true },
                    imageUrl: { type: Sequelize.STRING(255), allowNull: true },
                    contenuHtml: { type: Sequelize.TEXT, allowNull: false },
                    datePublication: { type: Sequelize.DATE, allowNull: false },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "Courses",
                {
                    id: cleId(Sequelize),
                    etat: { type: Sequelize.ENUM("suggestion", "valider"), allowNull: false },
                    nom: { type: Sequelize.STRING(255), allowNull: false, unique: true },
                    date: { type: Sequelize.DATEONLY, allowNull: false },
                    lieu: { type: Sequelize.STRING(255), allowNull: false },
                    distance: { type: Sequelize.STRING(100), allowNull: true },
                    type: {
                        type: Sequelize.ENUM("5km", "10km", "Semi", "Marathon", "Route", "Trail"),
                        allowNull: false,
                    },
                    lienWhatsapp: { type: Sequelize.STRING(500), allowNull: true },
                    lienSite: { type: Sequelize.STRING(500), allowNull: true },
                    lienInscription: { type: Sequelize.STRING(500), allowNull: true },
                    inscriptionsOuvertes: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
                    dateOuvertureInscription: { type: Sequelize.DATEONLY, allowNull: true },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "Statistiques",
                {
                    id: cleId(Sequelize),
                    cible: { type: Sequelize.STRING(255), allowNull: false },
                    typePersonne: { type: Sequelize.STRING(20), allowNull: false },
                    date: { type: Sequelize.DATEONLY, allowNull: false },
                    compteur: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
                    dateCreation: { type: Sequelize.DATE, allowNull: false },
                    derniereMiseAJour: { type: Sequelize.DATE, allowNull: false },
                },
                { transaction },
            );
            await queryInterface.addIndex("Statistiques", ["cible", "typePersonne", "date"], {
                name: "index_unique_evenement_jour",
                unique: true,
                transaction,
            });
            await queryInterface.addIndex("Statistiques", ["date"], {
                name: "statistiques_date",
                transaction,
            });

            await queryInterface.createTable(
                "Specialistes",
                {
                    id: cleId(Sequelize),
                    etat: { type: Sequelize.ENUM("suggestion", "valider"), allowNull: false },
                    nom: { type: Sequelize.STRING(255), allowNull: false, unique: true },
                    specialite: {
                        type: Sequelize.ENUM("kine_sport", "kine", "podologue", "osteopathe", "medecin_sport"),
                        allowNull: false,
                    },
                    detail: { type: Sequelize.TEXT, allowNull: false },
                    adresse: { type: Sequelize.STRING(500), allowNull: false },
                    telephone: { type: Sequelize.STRING(50), allowNull: true },
                    lienReservation: { type: Sequelize.STRING(500), allowNull: true },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "Images",
                {
                    id: cleId(Sequelize),
                    alt: { type: Sequelize.STRING(200), allowNull: false },
                    nomFichier: { type: Sequelize.STRING(200), allowNull: false, unique: true },
                    type: { type: Sequelize.ENUM("systeme", "galerie"), allowNull: false },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "Pages",
                {
                    id: cleId(Sequelize),
                    titre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
                    url: { type: Sequelize.STRING(255), allowNull: false, unique: true },
                    modifiable: { type: Sequelize.BOOLEAN, allowNull: false },
                    dansNavigation: { type: Sequelize.BOOLEAN, allowNull: true },
                    contenuHtml: { type: Sequelize.TEXT, allowNull: true },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "AdherentsCourse",
                {
                    id: cleId(Sequelize),
                    idAdherent: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: "Utilisateurs", key: "id" },
                        onUpdate: "CASCADE",
                        onDelete: "CASCADE",
                    },
                    idCourse: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: "Courses", key: "id" },
                        onUpdate: "CASCADE",
                        onDelete: "CASCADE",
                    },
                    statut: { type: Sequelize.ENUM("interesse", "participe"), allowNull: true },
                },
                { transaction },
            );
            await queryInterface.addIndex("AdherentsCourse", ["idAdherent", "idCourse"], {
                name: "adherents_course_id_adherent_id_course",
                unique: true,
                transaction,
            });
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            // Ordre inverse de la création (AdherentsCourse dépend de Utilisateurs et Courses)
            const tables = [
                "AdherentsCourse",
                "Pages",
                "Images",
                "Specialistes",
                "Statistiques",
                "Courses",
                "Articles",
                "Tokens",
                "Utilisateurs",
            ];
            for (const table of tables) {
                await queryInterface.dropTable(table, { transaction });
            }
            for (const typeEnum of TYPES_ENUM) {
                await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${typeEnum}";`, { transaction });
            }
        });
    },
};
