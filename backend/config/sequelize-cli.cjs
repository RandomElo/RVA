// Configuration de sequelize-cli (migrations), en CommonJS pour le CLI.
// Même chargement que config/env.js : seul backend/.env est lu, et dotenv n'écrase jamais
// une variable déjà définie (valeurs injectées par docker-compose prioritaires).
const path = require("path");
require("dotenv").config({ quiet: true, path: path.resolve(__dirname, "..", ".env") });

// Même URL et mêmes options que bdd/bdd.js
const config = {
    use_env_variable: "BDD_URL",
    dialect: "postgres",
    logging: false,
    define: {
        freezeTableName: true,
        timestamps: false,
    },
};

module.exports = {
    development: config,
    test: config,
    production: config,
};
