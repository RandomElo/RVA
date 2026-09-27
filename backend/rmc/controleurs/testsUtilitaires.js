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

export function fauxRes() {
    return {
        statut: 200,
        corps: undefined,
        status(code) { this.statut = code; return this; },
        json(corps) { this.corps = corps; return this; },
        cookie() { return this; },
    };
}

export async function appeler(controleur, req) {
    const res = fauxRes();
    await controleur({ ip: "127.0.0.1", ...req }, res, () => {});
    return res;
}

// Modèle Utilisateurs factice : generationToken renvoie directement l'objet de retour
export function fauxUtilisateurs(utilisateur) {
    return {
        tokensGeneres: [],
        async findOne() { return utilisateur; },
        async generationToken(req, res, u, objetRetour) {
            this.tokensGeneres.push(u.id);
            return res.json(objetRetour);
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
