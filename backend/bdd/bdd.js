import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import Utilisateurs from "./modeles/Utilisateurs.js";
import Tokens from "./modeles/Tokens.js";
import Articles from "./modeles/Articles.js";
import Courses from "./modeles/Courses.js";
import Statistiques from "./modeles/Statistiques.js";
import Specialistes from "./modeles/Specialistes.js";
import Images from "./modeles/Images.js";
import Pages from "./modeles/Pages.js";
import { logger } from "../fonctions/utilitaires/logger.js";
import AdherentsCourse from "./modeles/AdherentsCourse.js";

dotenv.config({ quiet: true });

// Initialisation de l'ORM
const sequelize = new Sequelize(process.env.BDD_URL, {
    dialect: "postgres",
    logging: false,
    define: {
        freezeTableName: true,
        timestamps: false,
    },
});

const bdd = {
    sequelize,
    Utilisateurs: Utilisateurs(sequelize),
    Tokens: Tokens(sequelize),
    Articles: Articles(sequelize),
    Courses: Courses(sequelize),
    Statistiques: Statistiques(sequelize),
    Specialistes: Specialistes(sequelize),
    Images: Images(sequelize),
    Pages: Pages(sequelize),
    AdherentsCourse:AdherentsCourse(sequelize)
};

// Associations

// Un utilisateur (adhérent) peut avoir plusieurs enregistrements AdherentsCourse
bdd.Utilisateurs.hasMany(bdd.AdherentsCourse, {
    foreignKey: "idAdherent",
    as: "coursesInscriptions",
});
bdd.AdherentsCourse.belongsTo(bdd.Utilisateurs, {
    foreignKey: "idAdherent",
    as: "adherent",
});

// Une course peut avoir plusieurs adhérents inscrits/intéressés
bdd.Courses.hasMany(bdd.AdherentsCourse, {
    foreignKey: "idCourse",
    as: "adherentsCourses",
});
bdd.AdherentsCourse.belongsTo(bdd.Courses, {
    foreignKey: "idCourse",
    as: "course",
});

// Connexion et synchronisation
try {
    await sequelize.authenticate();
    logger.info({ type: "DB_CONNECT" }, "🐘 Connexion à la base de données PostgreSQL réussie");

    await sequelize.sync();
    console.log("✅ Modèles synchronisés");
} catch (err) {
    logger.error({ type: "DB_ERROR", erreur: err.message }, "💥 Erreur de connexion à la base de données");
}

export default bdd;