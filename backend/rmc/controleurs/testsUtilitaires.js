import { before, after } from "node:test";

import transporteur from "../../fonctions/mailer/transporteur.js";

// Aucun mail réel : l'envoi SMTP est remplacé en mémoire
export function intercepterMails() {
    const mailsEnvoyes = [];
    const sendMailOriginal = transporteur.sendMail;
    before(() => {
        transporteur.sendMail = async (options) => { mailsEnvoyes.push(options); return {}; };
    });
    after(() => {
        transporteur.sendMail = sendMailOriginal;
        transporteur.close();
    });
    return mailsEnvoyes;
}

// headersSent passe à true dès qu'une réponse est envoyée, comme avec Express
export function fauxRes() {
    return {
        statut: 200,
        corps: undefined,
        enTetes: {},
        headersSent: false,
        status(code) { this.statut = code; return this; },
        json(corps) { this.corps = corps; this.headersSent = true; return this; },
        send(corps) { this.corps = corps; this.headersSent = true; return this; },
        end() { this.headersSent = true; return this; },
        sendStatus(code) { this.statut = code; this.headersSent = true; return this; },
        setHeader(nom, valeur) { this.enTetes[nom.toLowerCase()] = valeur; return this; },
        cookie() { return this; },
    };
}

export async function appeler(controleur, req) {
    const res = fauxRes();
    await controleur({ ip: "127.0.0.1", ...req }, res, () => {});
    return res;
}

// Modèle Utilisateurs factice : genererTokenSession renvoie un jeton fixe
export function fauxUtilisateurs(utilisateur) {
    return {
        tokensGeneres: [],
        async findOne() { return utilisateur; },
        async genererTokenSession(u) {
            this.tokensGeneres.push(u.id);
            return "jeton-factice";
        },
    };
}

// Instance Sequelize factice (non raw) avec update/destroy espionnés
export const instance = (donnees) => ({
    ...donnees,
    mises: [],
    detruit: false,
    async update(valeurs) { this.mises.push(valeurs); Object.assign(this, valeurs); },
    async destroy() { this.detruit = true; },
});
