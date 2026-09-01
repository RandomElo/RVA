// utilitaires/uploadPhoto.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import sharp from "sharp";

// 1. Centralisation des chemins
export const DOSSIER_ADHERENTS = path.join(process.cwd(), "medias", "adherents");
export const DOSSIER_GALERIE = path.join(process.cwd(), "medias", "galerie");
export const DOSSIER_MAILS = path.join(process.cwd(), "medias", "mails");

// 2. Traitement groupé de la création des dossiers
[DOSSIER_ADHERENTS, DOSSIER_GALERIE, DOSSIER_MAILS].forEach((dossier) => {
    if (!fs.existsSync(dossier)) {
        fs.mkdirSync(dossier, { recursive: true });
    }
});

// 3. Filtre d'image réutilisable
const imageFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Le fichier doit être une image"), false);
    }
    cb(null, true);
};

// 4. Configuration de Multer en MemoryStorage (Stockage temporaire en RAM)
const genererUploadMemoire = (tailleMaxMo = 5) => {
    return multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: tailleMaxMo * 1024 * 1024 },
        fileFilter: imageFilter,
    });
};

// Configs Multer pour intercepter l'envoi
export const enregistrerTrombinoscope = genererUploadMemoire(5);
export const enregistrerPhotoGalerie = genererUploadMemoire(10);

// 5. Fonction utilitaire pour convertir le buffer mémoire et l'enregistrer en WebP
export const sauvegarderEnWebp = async (buffer, dossierDestination, qualite = 80) => {
    const nomFichier = `${randomUUID()}.webp`;
    const cheminComplet = path.join(dossierDestination, nomFichier);

    await sharp(buffer)
        .webp({ quality: qualite }) // Convertit en WebP avec compression
        .toFile(cheminComplet);

    return nomFichier;
};

const pieceJointeFilter = (req, file, cb) => {
    const typesAcceptes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!typesAcceptes.includes(file.mimetype)) {
        return cb(new Error("Le fichier doit être un PDF ou une image (png, jpg, webp)"), false);
    }
    cb(null, true);
};

export const enregistrerPiecesJointesMail = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: pieceJointeFilter,
});

// 8. Sauvegarde d'une pièce jointe en conservant son format d'origine
export const sauvegarderPieceJointe = async (buffer, nomOriginal, dossierDestination = DOSSIER_MAILS) => {
    const extension = path.extname(nomOriginal).toLowerCase() || ".bin";
    const nomFichier = `${randomUUID()}${extension}`;
    const cheminComplet = path.join(dossierDestination, nomFichier);

    fs.writeFileSync(cheminComplet, buffer);

    return { nomFichier, nomOriginal };
};