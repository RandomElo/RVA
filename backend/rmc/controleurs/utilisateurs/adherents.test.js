import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import transporteur from "../../../fonctions/mailer/transporteur.js";
import { appeler, intercepterMails } from "../testsUtilitaires.js";
import { inviterAdherent, modifierInformationsUtilisateur, relancerInitialisationCompte, supprimer } from "./adherents.js";

const mailsEnvoyes = intercepterMails();
afterEach(() => {
    mailsEnvoyes.length = 0;
    mock.restoreAll();
});

const corps = { prenom: "Jean", nom: "Dupont", mail: "jean@exemple.fr", dateNaissance: "01/02" };

// Modèles factices : les utilisateurs créés et les tokens restent en mémoire
function fauxModeles() {
    const utilisateurs = [];
    const tokens = [];
    const Utilisateurs = {
        async findOne({ where }) { return utilisateurs.find((u) => u.mail === where.mail) ?? null; },
        async create(donnees) { const u = { id: utilisateurs.length + 1, ...donnees }; utilisateurs.push(u); return u; },
        async findAll() { return utilisateurs; },
    };
    const Tokens = {
        async create(donnees) { tokens.push(donnees); },
        async destroy({ where }) { tokens.splice(tokens.findIndex((t) => t.token === where.token), 1); },
    };
    return { utilisateurs, tokens, Utilisateurs, Tokens };
}

test("inviterAdherent : succès, renvoie la liste des adhérents", async () => {
    const { utilisateurs, tokens, Utilisateurs, Tokens } = fauxModeles();
    const res = await appeler(inviterAdherent, { body: corps, Utilisateurs, Tokens });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: utilisateurs });
    assert.equal(utilisateurs.length, 1);
    assert.equal(tokens.length, 1);
    assert.equal(mailsEnvoyes.length, 1);
});

test("inviterAdherent : échec du mail, avertissement avec la liste et token supprimé", async () => {
    mock.method(transporteur, "sendMail", async () => { throw new Error("SMTP indisponible"); });
    const { utilisateurs, tokens, Utilisateurs, Tokens } = fauxModeles();
    const res = await appeler(inviterAdherent, { body: corps, Utilisateurs, Tokens });
    assert.equal(res.statut, 200);
    assert.equal(res.corps.etat, true);
    assert.equal(res.corps.detail.inviter, "avertissement");
    assert.match(res.corps.detail.detail, /relancer/);
    assert.deepEqual(res.corps.detail.donnees, utilisateurs);
    assert.deepEqual(utilisateurs.map((u) => u.mail), ["jean@exemple.fr"]);
    // Sans token restant, « relancer l'initialisation » pourra renvoyer le mail
    assert.equal(tokens.length, 0);
});

test("supprimer : adhérent inexistant, 404", async () => {
    const { Utilisateurs } = fauxModeles();
    const res = await appeler(supprimer, { body: { nom: "inconnu@exemple.fr" }, Utilisateurs });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("relancerInitialisationCompte : adhérent inexistant, 404", async () => {
    const { Utilisateurs, Tokens } = fauxModeles();
    const res = await appeler(relancerInitialisationCompte, { body: { mail: "inconnu@exemple.fr" }, Utilisateurs, Tokens });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
    assert.equal(mailsEnvoyes.length, 0);
});

// update renvoie [nombre de lignes modifiées], comme Sequelize
const utilisateursModification = (nbModifies) => ({
    misesAJour: [],
    async update(donnees, options) {
        this.misesAJour.push({ donnees, options });
        return [nbModifies];
    },
    async findAll() {
        return [{ mail: corps.mail }];
    },
});

test("modifierInformationsUtilisateur : succès, mise à jour par mail et liste renvoyée", async () => {
    const Utilisateurs = utilisateursModification(1);
    const res = await appeler(modifierInformationsUtilisateur, { body: corps, Utilisateurs });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: [{ mail: corps.mail }] });
    assert.deepEqual(Utilisateurs.misesAJour[0].options, { where: { mail: corps.mail } });
});

test("modifierInformationsUtilisateur : aucun adhérent avec ce mail, 404", async () => {
    const res = await appeler(modifierInformationsUtilisateur, { body: corps, Utilisateurs: utilisateursModification(0) });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});
