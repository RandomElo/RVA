"use strict";

// Ajoute l'identifiant Google (sub) lié aux comptes administrateurs (rmc/controleurs/auth/google.js).
// Colonne nullable et unique : un même compte Google ne peut pas être lié à deux utilisateurs.
// En PostgreSQL, "unique" crée la contrainte "Utilisateurs_googleId_key", supprimée avec la colonne.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.addColumn(
                "Utilisateurs",
                "googleId",
                { type: Sequelize.STRING(255), allowNull: true, unique: true },
                { transaction },
            );
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.removeColumn("Utilisateurs", "googleId", { transaction });
        });
    },
};
