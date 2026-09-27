// Variables d'environnement (doit rester le premier import)
import "./config/env.js";

// Packages
import e from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";

// Middlewares
import { accessibiliteBdd } from "./rmc/middlewares/accessibiliteBdd.js";
import { verificationCookie } from "./rmc/middlewares/verificationCookie.js";

import bdd from "./bdd/bdd.js";
import routeurUtilisateurs from "./rmc/routeurs/utilisateurs.js";
import routeurAutres from "./rmc/routeurs/autres.js";
import routeurBlog from "./rmc/routeurs/blog.js";
import routeurCourses from "./rmc/routeurs/courses.js";
import routeurStatistiques from "./rmc/routeurs/statistiques.js";
import routeurSpecialistes from "./rmc/routeurs/specialistes.js";
import { accesUtilisateur } from "./rmc/middlewares/accesUtilisateurs.js";
import { accesAdmin } from "./rmc/middlewares/accesAdmin.js";
import routeurImages from "./rmc/routeurs/images.js";
import routeurPages from "./rmc/routeurs/pages.js";
import { generaleLimiteur } from "./rmc/middlewares/limiteurRequetes.js";
import { logger } from "./fonctions/utilitaires/logger.js";
import { loggerRequete } from "./rmc/middlewares/loggerRequere.js";
import routeurHelloasso from "./rmc/routeurs/helloasso.js";

const { PORT_EXPRESS, IP_FRONTEND } = process.env;
const port = PORT_EXPRESS || 8100;
const app = e();
app.disable("x-powered-by"); // Ne pas annoncer Express dans les en-têtes

app.set('trust proxy', 1);

app.use(loggerRequete);

app.use(cors({
    origin: function (origin, callback) {
        // Si la requête vient d'un script serveur (ex: prerender.mjs ou wget) origin est undefined
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            IP_FRONTEND,
            "http://127.0.0.1:4173",
            "http://localhost:4173"
        ];

        // Fermé par défaut : toute origine n'est acceptée que si CORS_OUVERT=true (dev uniquement)
        if (allowedOrigins.includes(origin) || process.env.CORS_OUVERT === "true") {
            callback(null, true);
        } else {
            callback(null, false); // Origine refusée : pas d'en-têtes CORS, le navigateur bloque
        }
    },
    credentials: true
}));

app.use(compression());
app.use(e.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(generaleLimiteur);

app.use(accessibiliteBdd(bdd));
app.use(verificationCookie);

app.use("/utilisateurs", routeurUtilisateurs);
app.use("/autres", routeurAutres);
app.use("/articles", routeurBlog);
app.use("/courses", routeurCourses);
app.use("/specialistes", accesUtilisateur, routeurSpecialistes);
app.use("/statistiques", routeurStatistiques);
app.use("/images", routeurImages);
app.use("/pages", routeurPages);
app.use("/helloasso", routeurHelloasso)

// Stockage de l'instance du serveur dans 'server' pour permettre l'arrêt propre
const server = app.listen(port, () => logger.info({ type: 'BOOT' }, `🚀 Serveur démarré sur le port ${port}`));

const stopperServeur = (signal) => {
    logger.info({ type: "SHUTDOWN", signal }, `🛑 Signal ${signal} reçu. Arrêt du serveur en cours...`);

    server.close(() => {
        logger.info({ type: "SHUTDOWN_COMPLETE" }, "✅ Serveur Express arrêté proprement.");
        process.exit(0);
    });
};

process.on("SIGTERM", () => stopperServeur("SIGTERM"));
process.on("SIGINT", () => stopperServeur("SIGINT"));