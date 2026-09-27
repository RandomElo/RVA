import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";

import { appeler, instance } from "./testsUtilitaires.js";
import { logger } from "../../fonctions/utilitaires/logger.js";

// Aucune écriture dans les vrais dossiers medias/ : galerie (process.cwd()/medias/galerie) et
// images système (DOSSIER_IMAGES) pointent vers un dossier temporaire avant l'import du contrôleur
const dossierTemporaire = fs.mkdtempSync(path.join(os.tmpdir(), "rva-images-"));
const dossierImages = path.join(dossierTemporaire, "img");
fs.mkdirSync(dossierImages);
const cwdOriginal = process.cwd();
const dossierImagesOriginal = process.env.DOSSIER_IMAGES;
process.chdir(dossierTemporaire);
process.env.DOSSIER_IMAGES = dossierImages;

const { ajouterGalerie, modifierAlt, remplacer, supprimerPhotoGalerie } = await import("./images.js");
const { DOSSIER_GALERIE } = await import("../../fonctions/utilitaires/enregistrementPhoto.js");

after(() => {
    process.chdir(cwdOriginal);
    if (dossierImagesOriginal === undefined) delete process.env.DOSSIER_IMAGES;
    else process.env.DOSSIER_IMAGES = dossierImagesOriginal;
    fs.rmSync(dossierTemporaire, { recursive: true, force: true });
});

const Images = {
    async findOne() {
        return null;
    },
};

const fauxImages = (image = null) => ({
    crees: [],
    async findOne() {
        return image;
    },
    async findAll() {
        return [{ nomFichier: "x.webp", alt: "X", type: "galerie" }];
    },
    async create(donnees) {
        this.crees.push(donnees);
        return donnees;
    },
});

const pngValide = () =>
    sharp({ create: { width: 2, height: 2, channels: 3, background: "#ff0000" } })
        .png()
        .toBuffer();

test("remplacer : image inconnue en base, 404", async () => {
    const res = await appeler(remplacer, { file: { buffer: Buffer.from("") }, body: { alt: "Texte", nomFichier: "inconnue.webp" }, Images });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("supprimerPhotoGalerie : image inconnue, 404", async () => {
    const res = await appeler(supprimerPhotoGalerie, { body: { image: "inconnue.webp" }, Images });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("modifierAlt : image inconnue, 404", async () => {
    const res = await appeler(modifierAlt, { body: { nomFichier: "inconnue.webp", alt: "Texte" }, Images });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

// ajouterGalerie

test("ajouterGalerie : alt manquant, 400 sans conversion", async () => {
    const images = fauxImages();
    const res = await appeler(ajouterGalerie, { body: {}, file: { buffer: Buffer.from("x") }, query: {}, Images: images });
    assert.equal(res.statut, 400);
    assert.equal(images.crees.length, 0);
});

test("ajouterGalerie : fichier manquant, 400", async () => {
    const images = fauxImages();
    const res = await appeler(ajouterGalerie, { body: { alt: "Départ" }, query: {}, Images: images });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Aucun fichier reçu" });
    assert.equal(images.crees.length, 0);
});

test("ajouterGalerie : image convertie en WebP, écrite et enregistrée en base", async () => {
    assert.ok(DOSSIER_GALERIE.startsWith(process.cwd()) && process.cwd() !== cwdOriginal);
    const images = fauxImages();
    const res = await appeler(ajouterGalerie, { body: { alt: "Départ" }, file: { buffer: await pngValide() }, query: { mode: "galerie" }, Images: images });
    assert.equal(res.corps.etat, true);
    assert.equal(res.corps.detail.notification.titre, "Enregistrée");
    assert.equal(images.crees.length, 1);
    const { nomFichier, alt, type } = images.crees[0];
    assert.match(nomFichier, /^[0-9a-f-]{36}\.webp$/);
    assert.equal(alt, "Départ");
    assert.equal(type, "galerie");
    const metadonnees = await sharp(path.join(DOSSIER_GALERIE, nomFichier)).metadata();
    assert.equal(metadonnees.format, "webp");
});

test("ajouterGalerie : fichier non image, 500 sans enregistrement en base", async () => {
    mock.method(logger, "error", () => {});
    const images = fauxImages();
    const res = await appeler(ajouterGalerie, { body: { alt: "Départ" }, file: { buffer: Buffer.from("pas une image") }, query: {}, Images: images });
    mock.restoreAll();
    assert.equal(res.statut, 500);
    assert.equal(images.crees.length, 0);
});

// remplacer

test("remplacer : aucun fichier, 400", async () => {
    const res = await appeler(remplacer, { body: { alt: "Texte", nomFichier: "banniere.webp" }, Images: fauxImages() });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Aucune image fournie." });
});

test("remplacer : nom de fichier dangereux ou alt manquant, 400", async () => {
    for (const body of [{ alt: "Texte", nomFichier: "../package.json" }, { nomFichier: "banniere.webp" }]) {
        const res = await appeler(remplacer, { file: { buffer: Buffer.from("x") }, body, Images: fauxImages({ nomFichier: "banniere.webp" }) });
        assert.equal(res.statut, 400);
    }
});

test("remplacer : image en base mais absente du disque, 404", async () => {
    const res = await appeler(remplacer, { file: { buffer: Buffer.from("x") }, body: { alt: "Texte", nomFichier: "absente.webp" }, Images: fauxImages({ nomFichier: "absente.webp" }) });
    assert.equal(res.statut, 404);
    assert.equal(fs.existsSync(path.join(dossierImages, "absente.webp")), false);
});

test("remplacer : fichier existant remplacé", async () => {
    const chemin = path.join(dossierImages, "banniere.webp");
    fs.writeFileSync(chemin, "ancien");
    const res = await appeler(remplacer, { file: { buffer: Buffer.from("nouveau") }, body: { alt: "Bannière", nomFichier: "banniere.webp" }, Images: fauxImages({ nomFichier: "banniere.webp" }) });
    assert.equal(res.statut, 200);
    assert.equal(res.corps.detail.notification.titre, "Remplacée");
    assert.equal(fs.readFileSync(chemin, "utf8"), "nouveau");
});

// modifierAlt

const albumFactice = (contenuHtml) => ({
    contenuHtml,
    sauvegardes: 0,
    async save() {
        this.sauvegardes++;
    },
});

test("modifierAlt : champs non textuels, 400", async () => {
    const res = await appeler(modifierAlt, { body: { nomFichier: "a.webp", alt: 3 }, Images: fauxImages() });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte." });
});

test("modifierAlt : alt mis à jour, légende reportée dans les albums qui utilisent l'image", async () => {
    const image = instance({ nomFichier: "a.webp", alt: "Ancien" });
    const album = albumFactice(
        JSON.stringify([
            { chemin: "a.webp", legende: "Ancien" },
            { chemin: "b.webp", legende: "B" },
        ]),
    );
    const autreAlbum = albumFactice(JSON.stringify([{ chemin: "c.webp", legende: "C" }]));
    const Articles = {
        async findAll() {
            return [album, autreAlbum, albumFactice(null)];
        },
    };
    const res = await appeler(modifierAlt, { body: { nomFichier: "a.webp", alt: "Nouveau" }, Images: fauxImages(image), Articles });
    assert.equal(res.corps.etat, true);
    assert.deepEqual(image.mises, [{ alt: "Nouveau" }]);
    assert.deepEqual(JSON.parse(album.contenuHtml), [
        { chemin: "a.webp", legende: "Nouveau" },
        { chemin: "b.webp", legende: "B" },
    ]);
    assert.equal(album.sauvegardes, 1);
    assert.equal(autreAlbum.sauvegardes, 0);
});

test("modifierAlt : nom présent seulement en sous-chaîne d'un autre chemin, album inchangé", async () => {
    const image = instance({ nomFichier: "a.webp", alt: "Ancien" });
    const album = albumFactice(JSON.stringify([{ chemin: "photo-a.webp", legende: "Autre" }]));
    const Articles = {
        async findAll() {
            return [album];
        },
    };
    const res = await appeler(modifierAlt, { body: { nomFichier: "a.webp", alt: "Nouveau" }, Images: fauxImages(image), Articles });
    assert.equal(res.corps.etat, true);
    assert.equal(album.sauvegardes, 0);
});

test("modifierAlt : contenu d'album mal formé ignoré sans bloquer les autres albums", async () => {
    const avertissement = mock.method(logger, "warn", () => {});
    const image = instance({ nomFichier: "a.webp", alt: "Ancien" });
    const albumCasse = albumFactice("<p>a.webp</p>");
    const album = albumFactice(JSON.stringify([{ chemin: "a.webp", legende: "Ancien" }]));
    const Articles = {
        async findAll() {
            return [albumCasse, album];
        },
    };
    const res = await appeler(modifierAlt, { body: { nomFichier: "a.webp", alt: "Nouveau" }, Images: fauxImages(image), Articles });
    mock.restoreAll();
    assert.equal(res.statut, 200);
    assert.deepEqual(image.mises, [{ alt: "Nouveau" }]);
    assert.equal(albumCasse.sauvegardes, 0);
    assert.equal(album.sauvegardes, 1);
    assert.equal(avertissement.mock.callCount(), 1);
});

test("supprimerPhotoGalerie : nom de fichier dangereux, 400 au format { etat, detail }", async () => {
    const res = await appeler(supprimerPhotoGalerie, { body: { image: "../package.json" }, Images });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte." });
});
