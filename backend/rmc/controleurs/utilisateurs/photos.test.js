import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";

import { appeler } from "../testsUtilitaires.js";

// Aucune écriture dans le vrai dossier medias/adherents : DOSSIER_ADHERENTS dépend de process.cwd()
// au moment de l'import, on se place donc dans un dossier temporaire avant d'importer le contrôleur
const dossierTemporaire = fs.mkdtempSync(path.join(os.tmpdir(), "rva-photos-"));
const cwdOriginal = process.cwd();
process.chdir(dossierTemporaire);

const { enregistrerPhotoControleur, photo, supprimerPhoto } = await import("./photos.js");
const { DOSSIER_ADHERENTS } = await import("../../../fonctions/utilitaires/enregistrementPhoto.js");

afterEach(() => {
    for (const fichier of fs.readdirSync(DOSSIER_ADHERENTS)) {
        fs.rmSync(path.join(DOSSIER_ADHERENTS, fichier), { force: true });
    }
});
after(() => {
    process.chdir(cwdOriginal);
    fs.rmSync(dossierTemporaire, { recursive: true, force: true });
});

const pngValide = () =>
    sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffffff" } })
        .png()
        .toBuffer();

// Modèle factice : findByPk renvoie l'adhérent donné, findAll la liste renvoyée au client
const fauxUtilisateurs = (utilisateur) => ({
    misesAJour: [],
    idsDemandes: [],
    liste: [{ id: 1, prenom: "Jean", nom: "Dupont" }],
    async findByPk(id) {
        this.idsDemandes.push(id);
        return utilisateur;
    },
    async findAll() {
        return this.liste;
    },
    async update(valeurs, options) {
        this.misesAJour.push([valeurs, options]);
    },
});

// ---------- enregistrerPhotoControleur ----------

test("enregistrerPhotoControleur : adhérent inexistant, 404", async () => {
    const Utilisateurs = {
        async findByPk() {
            return null;
        },
    };
    const res = await appeler(enregistrerPhotoControleur, { file: { buffer: Buffer.from("") }, params: { id: "999" }, Utilisateurs });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("enregistrerPhotoControleur : aucun fichier, 400 au format { etat, detail }", async () => {
    const res = await appeler(enregistrerPhotoControleur, { params: { id: "1" }, Utilisateurs: {} });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Aucun fichier reçu" });
});

test("enregistrerPhotoControleur : enregistre en WebP, supprime l'ancienne photo et met à jour la base", async () => {
    const Utilisateurs = fauxUtilisateurs({ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: "ancienne.webp" });
    fs.writeFileSync(path.join(DOSSIER_ADHERENTS, "ancienne.webp"), "ancienne");
    const res = await appeler(enregistrerPhotoControleur, { file: { buffer: await pngValide() }, params: { id: "1" }, Utilisateurs });

    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: Utilisateurs.liste });
    assert.deepEqual(Utilisateurs.idsDemandes, ["1"]);

    const fichiers = fs.readdirSync(DOSSIER_ADHERENTS);
    assert.equal(fichiers.length, 1);
    const [nouveau] = fichiers;
    assert.match(nouveau, /\.webp$/);
    const { format } = await sharp(path.join(DOSSIER_ADHERENTS, nouveau)).metadata();
    assert.equal(format, "webp");

    assert.deepEqual(Utilisateurs.misesAJour, [[{ cheminTrombinoscope: nouveau }, { where: { id: 1 } }]]);
});

test("enregistrerPhotoControleur : sans ancienne photo, enregistre seulement la nouvelle", async () => {
    const Utilisateurs = fauxUtilisateurs({ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: null });
    const res = await appeler(enregistrerPhotoControleur, { file: { buffer: await pngValide() }, params: { id: "1" }, Utilisateurs });

    assert.equal(res.statut, 200);
    const fichiers = fs.readdirSync(DOSSIER_ADHERENTS);
    assert.equal(fichiers.length, 1);
    assert.deepEqual(Utilisateurs.misesAJour, [[{ cheminTrombinoscope: fichiers[0] }, { where: { id: 1 } }]]);
});

test("enregistrerPhotoControleur : image illisible, 500 sans toucher à la base ni à l'ancienne photo", async () => {
    const Utilisateurs = fauxUtilisateurs({ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: "ancienne.webp" });
    fs.writeFileSync(path.join(DOSSIER_ADHERENTS, "ancienne.webp"), "ancienne");
    const res = await appeler(enregistrerPhotoControleur, { file: { buffer: crypto.randomBytes(256) }, params: { id: "1" }, Utilisateurs });

    assert.equal(res.statut, 500);
    assert.deepEqual(res.corps, { etat: false, detail: "Erreur lors de l'enregistrement de la photo" });
    assert.deepEqual(Utilisateurs.misesAJour, []);
    assert.deepEqual(fs.readdirSync(DOSSIER_ADHERENTS), ["ancienne.webp"]);
});

// ---------- photo ----------

// Ce message déclenche la déconnexion automatique côté frontend (useRequete)
test("photo : visiteur non connecté, 403 « Vous n'êtes pas connecté »", async () => {
    const res = await appeler(photo, { params: { nomFichier: "photo.webp" } });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
});

// ---------- supprimerPhoto ----------
// supprimerPhoto travaille dans DOSSIER_ADHERENTS, donc dans le dossier temporaire : vraie suppression sur disque

test("supprimerPhoto : id absent, 400", async () => {
    const res = await appeler(supprimerPhoto, { body: {}, Utilisateurs: fauxUtilisateurs(null) });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte." });
});

test("supprimerPhoto : adhérent inexistant, 404", async () => {
    const Utilisateurs = fauxUtilisateurs(null);
    const res = await appeler(supprimerPhoto, { body: { id: 999 }, Utilisateurs });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
    assert.deepEqual(Utilisateurs.misesAJour, []);
});

test("supprimerPhoto : supprime le fichier et vide cheminTrombinoscope", async () => {
    fs.writeFileSync(path.join(DOSSIER_ADHERENTS, "ancienne.webp"), "ancienne");
    fs.writeFileSync(path.join(DOSSIER_ADHERENTS, "autre.webp"), "autre");
    const Utilisateurs = fauxUtilisateurs({ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: "ancienne.webp" });
    const res = await appeler(supprimerPhoto, { body: { id: 1 }, Utilisateurs });

    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: Utilisateurs.liste });
    assert.deepEqual(fs.readdirSync(DOSSIER_ADHERENTS), ["autre.webp"]);
    assert.deepEqual(Utilisateurs.misesAJour, [[{ cheminTrombinoscope: "" }, { where: { id: 1 } }]]);
});

test("supprimerPhoto : sans photo enregistrée, aucune suppression sur disque", async () => {
    fs.writeFileSync(path.join(DOSSIER_ADHERENTS, "autre.webp"), "autre");
    const Utilisateurs = fauxUtilisateurs({ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: null });
    const res = await appeler(supprimerPhoto, { body: { id: 1 }, Utilisateurs });

    assert.equal(res.statut, 200);
    assert.deepEqual(fs.readdirSync(DOSSIER_ADHERENTS), ["autre.webp"]);
    assert.deepEqual(Utilisateurs.misesAJour, [[{ cheminTrombinoscope: "" }, { where: { id: 1 } }]]);
});
