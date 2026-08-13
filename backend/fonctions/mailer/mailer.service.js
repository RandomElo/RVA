// mailer.service.js
import hbs from "nodemailer-express-handlebars"
import transporteur from "./transporteur.js"

export default async function envoiMail(to, subject, template, context, replyTo = null) {
    return transporteur.sendMail({
        from: process.env.MAIL_FROM, // Doit être votre email de compte Brevo
        to,                          // Chaîne de caractères : "mail1, mail2, mail3, mail4"
        subject,
        template,                    // Nom du fichier template (ex: 'welcome')
        context,                     // Variables injectées {}
        headers: {
            "X-Sib-Headers": JSON.stringify({
                "X-Mailin-Tag": "PasDeTracking",
                "X-Mailin-tracking": "0" // Désactive le tracking pour cet envoi précis
            })
        },
        ...(replyTo && { replyTo }),
    });
}