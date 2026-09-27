-- Marquage d'une base créée par l'ancien sequelize.sync() (dev ou prod).
-- À exécuter une seule fois, AVANT de déployer la version qui lance les migrations au démarrage.
-- Indique à sequelize-cli que le schéma initial est déjà en place : db:migrate n'essaiera pas de recréer les tables.
-- Idempotent : peut être relancé sans effet.
CREATE TABLE IF NOT EXISTS "SequelizeMeta" ("name" VARCHAR(255) NOT NULL PRIMARY KEY);
INSERT INTO "SequelizeMeta" ("name") VALUES ('20260927000000-schema-initial.cjs') ON CONFLICT DO NOTHING;
