// mailer.service.js
import transporteur from "./transporteur.js"

export default async function envoiMail(to, subject, template, context, replyTo = null, attachments = []) {
    return transporteur.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        template,
        context,
        attachments, // [{ filename, content (Buffer) }, ...]
        headers: {
            "X-Sib-Headers": JSON.stringify({
                "X-Mailin-Tag": "PasDeTracking",
                "X-Mailin-tracking": "0"
            })
        },
        ...(replyTo && { replyTo }),
    });
}