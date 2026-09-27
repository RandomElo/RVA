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
        // findAll filtre sur le type et details.idUtilisateur, comme la requête Sequelize
        async findAll({ where }) {
            return tokens.filter((t) => t.type === where.type && t.details?.idUtilisateur === where.details?.idUtilisateur);
        },
        // where.token peut être une valeur ou un tableau (IN), comme avec Sequelize
        async destroy({ where }) {
            const cibles = [where.token].flat();
            for (let i = tokens.length - 1; i >= 0; i--) {
                if (cibles.includes(tokens[i].token)) tokens.splice(i, 1);
            }
        },
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

const utilisateurExistant = { id: 1, prenom: "Jean", nom: "Dupont", mail: "jean@exemple.fr", role: "adherent" };
const tokenLien = (token, dateExpiration, idUtilisateur = 1) => ({ token, type: "lienConnexion", details: { idUtilisateur }, dateExpiration });

test("relancerInitialisationCompte : lien encore valide, relance refusée sans mail", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T12:00:00Z") });
    const { utilisateurs, tokens, Utilisateurs, Tokens } = fauxModeles();
    utilisateurs.push(utilisateurExistant);
    tokens.push(tokenLien("valide", new Date("2026-09-28T08:00:00Z")));
    const res = await appeler(relancerInitialisationCompte, { body: { mail: utilisateurExistant.mail }, Utilisateurs, Tokens });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { mail: false, detail: "L'utilisateur a déjà reçu un mail il y a moins de 24h." } });
    assert.equal(mailsEnvoyes.length, 0);
    assert.deepEqual(tokens.map((x) => x.token), ["valide"]);
});

test("relancerInitialisationCompte : liens expirés supprimés, nouveau mail envoyé", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T12:00:00Z") });
    const { utilisateurs, tokens, Utilisateurs, Tokens } = fauxModeles();
    utilisateurs.push(utilisateurExistant);
    tokens.push(
        tokenLien("expire1", new Date("2026-09-25T12:00:00Z")),
        tokenLien("expire2", new Date("2026-09-27T11:59:59Z")),
        tokenLien("autreUtilisateur", new Date("2026-09-20T12:00:00Z"), 2),
    );
    const res = await appeler(relancerInitialisationCompte, { body: { mail: utilisateurExistant.mail }, Utilisateurs, Tokens });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { mail: true, detail: "Mail envoyé avec succès" } });
    assert.equal(mailsEnvoyes.length, 1);
    assert.equal(mailsEnvoyes[0].to, utilisateurExistant.mail);
    // Les deux liens expirés de l'adhérent disparaissent, celui d'un autre utilisateur reste
    const restants = tokens.map((x) => x.token);
    assert.ok(!restants.includes("expire1") && !restants.includes("expire2"));
    assert.ok(restants.includes("autreUtilisateur"));
    const nouveau = tokens.find((x) => x.details.idUtilisateur === 1);
    assert.equal(nouveau.dateExpiration.getTime(), new Date("2026-09-28T12:00:00Z").getTime());
});

test("relancerInitialisationCompte : aucun lien existant, mail envoyé", async () => {
    const { utilisateurs, tokens, Utilisateurs, Tokens } = fauxModeles();
    utilisateurs.push(utilisateurExistant);
    const res = await appeler(relancerInitialisationCompte, { body: { mail: utilisateurExistant.mail }, Utilisateurs, Tokens });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { mail: true, detail: "Mail envoyé avec succès" } });
    assert.equal(mailsEnvoyes.length, 1);
    assert.equal(tokens.length, 1);
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

// Modèle espion : toute méthode appelée est enregistrée, pour vérifier qu'aucun accès à la base n'a lieu
function utilisateursEspion() {
    const appels = [];
    const enregistrer = (nom) => async () => { appels.push(nom); return nom === "update" ? [1] : null; };
    return { appels, findOne: enregistrer("findOne"), create: enregistrer("create"), update: enregistrer("update"), findAll: enregistrer("findAll") };
}

const refusAuthentification = { etat: true, detail: { inviter: "erreur", detail: "Les informations d'authentification ne respectent pas les règles définies." } };
const refusCompte = { etat: true, detail: { inviter: "erreur", detail: "Les informations de compte ne respectent pas les règles définies." } };

const casInvalides = [
    { cas: "mail invalide", body: { ...corps, mail: "pas-un-mail" }, attendu: refusAuthentification },
    { cas: "prénom invalide", body: { ...corps, prenom: "Jean<script>" }, attendu: refusCompte },
    { cas: "nom invalide", body: { ...corps, nom: "Dupont123" }, attendu: refusCompte },
    { cas: "date de naissance invalide", body: { ...corps, dateNaissance: "2000-02-01" }, attendu: refusCompte },
];

for (const [nomControleur, controleur] of [["inviterAdherent", inviterAdherent], ["modifierInformationsUtilisateur", modifierInformationsUtilisateur]]) {
    for (const { cas, body, attendu } of casInvalides) {
        test(`${nomControleur} : ${cas}, refus sans accès à la base`, async () => {
            const Utilisateurs = utilisateursEspion();
            const res = await appeler(controleur, { body, Utilisateurs });
            assert.equal(res.statut, 200);
            assert.deepEqual(res.corps, attendu);
            assert.deepEqual(Utilisateurs.appels, []);
            assert.equal(mailsEnvoyes.length, 0);
        });
    }
}

test("inviterAdherent : mail déjà existant, aucun compte créé ni mail envoyé", async () => {
    const { utilisateurs, tokens, Utilisateurs, Tokens } = fauxModeles();
    utilisateurs.push(utilisateurExistant);
    const res = await appeler(inviterAdherent, { body: corps, Utilisateurs, Tokens });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { inviter: "erreur", detail: "Mail déjà existant." } });
    assert.deepEqual(utilisateurs, [utilisateurExistant]);
    assert.equal(tokens.length, 0);
    assert.equal(mailsEnvoyes.length, 0);
});
