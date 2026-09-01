// mailer/transporter.js
import nodemailer from "nodemailer"
import { create } from "express-handlebars"
import hbs from "nodemailer-express-handlebars"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. Création du transporter configuré spécifiquement pour BREVO ---
const transporteur = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    // logger: true,  // 🌟 FORCE NODEMAILER À ENREGISTRER CHAQUE ÉTAPE DANS LA CONSOLE
    // debug: true,   // 🌟 PRÉSENTE LES COMMUNICATIONS SMTP BRUTES
    secure: false, // false pour le port 587
    auth: {
        user: process.env.MAIL_UTILISATEUR, // Votre adresse email de connexion Brevo
        pass: process.env.KEY_BREVO   // Votre clé API / SMTP Brevo
    },
});

// --- 2. Instance de express-handlebars (avec vos dossiers et helpers) ---
const hbsInstance = create({
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'templates', 'layouts'),
    partialsDir: path.join(__dirname, 'templates', 'partials'),
    defaultLayout: 'base',
    helpers: {
        year: () => new Date().getFullYear(),
        inc: (valeur) => valeur + 1,
        gt: (a, b) => a > b,
    },
});

// --- 3. Plug UNIQUE du moteur de template Handlebars ---
transporteur.use(
    'compile',
    hbs({
        viewEngine: hbsInstance,
        viewPath: path.join(__dirname, 'templates'),
        extName: '.hbs',
    })
);

// --- 4. Vérification de la connexion ---
transporteur.verify((err) => {
    if (err) {
        console.error('[mailer] Erreur de configuration SMTP Brevo :', err.message);
    } else {
        console.log('[mailer] Serveur SMTP Brevo prêt à envoyer des mails ✅');
    }
});

export default transporteur;
