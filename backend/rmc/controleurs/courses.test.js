import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import { appeler, intercepterMails } from "./testsUtilitaires.js";
import { cree, modifierCourse, modifierInteressement, suggestion, supprimerCourse, toutesLesCourses } from "./courses.js";

const mailsEnvoyes = intercepterMails();
afterEach(() => {
    mailsEnvoyes.length = 0;
    mock.timers.reset();
});

// 27/09/2026 à 22h00 à Paris (20h00 UTC) : minuit UTC du jour est déjà passé
const figerHorloge = (iso = "2026-09-27T20:00:00Z") => {
    mock.timers.enable({ apis: ["Date"], now: new Date(iso) });
};

const fauxCourses = () => ({
    crees: [],
    async create(donnees) { this.crees.push(donnees); return { id: this.crees.length, ...donnees }; },
    async findAll() { return []; },
});

const corpsCourse = (valeurs) => ({ nom: "Foulées", lieu: "Vincennes", type: "10km", inscriptionsOuvertes: true, ...valeurs });

const creer = (valeurs) => {
    const Courses = fauxCourses();
    return appeler(cree, { body: corpsCourse(valeurs), Courses }).then((res) => ({ res, Courses }));
};

test("cree : une course le jour même est acceptée", async () => {
    figerHorloge();
    const { res, Courses } = await creer({ date: "2026-09-27" });
    assert.equal(res.corps.detail.course, true);
    assert.equal(Courses.crees.length, 1);
});

test("cree : une course la veille est refusée", async () => {
    figerHorloge();
    const { res, Courses } = await creer({ date: "2026-09-26" });
    assert.deepEqual(res.corps, { etat: true, detail: { course: false, detail: "Date invalide." } });
    assert.equal(Courses.crees.length, 0);
});

test("cree : après minuit à Paris, la veille (date UTC encore courante) est refusée", async () => {
    figerHorloge("2026-09-27T22:30:00Z"); // 28/09 à 00h30 à Paris
    const { res, Courses } = await creer({ date: "2026-09-27" });
    assert.equal(res.corps.detail.course, false);
    assert.equal(Courses.crees.length, 0);
});

test("cree : ouverture des inscriptions le jour même acceptée", async () => {
    figerHorloge();
    const { res, Courses } = await creer({ date: "2026-10-10", dateOuvertureInscription: "2026-09-27" });
    assert.equal(res.corps.detail.course, true);
    assert.equal(Courses.crees[0].dateOuvertureInscription, "2026-09-27");
});

test("cree : ouverture des inscriptions la veille refusée", async () => {
    figerHorloge();
    const { res, Courses } = await creer({ date: "2026-10-10", dateOuvertureInscription: "2026-09-26" });
    assert.deepEqual(res.corps, { etat: true, detail: { course: false, detail: "Date d'ouverture des inscriptions invalide." } });
    assert.equal(Courses.crees.length, 0);
});

test("suggestion : une course le jour même est acceptée et notifiée", async () => {
    figerHorloge();
    const Courses = fauxCourses();
    const Utilisateurs = { async findByPk() { return { prenom: "Eloi", nom: "Test" }; } };
    const res = await appeler(suggestion, { body: corpsCourse({ date: "2026-09-27" }), Courses, Utilisateurs, idUtilisateur: 1 });
    assert.deepEqual(res.corps, { etat: true, detail: { course: true, detail: "Suggestion envoyée avec succès !" } });
    assert.equal(Courses.crees[0].etat, "suggestion");
    assert.equal(mailsEnvoyes.length, 1);
});

test("suggestion : compte supprimé depuis la connexion, 403 avant toute écriture", async () => {
    figerHorloge();
    const Courses = fauxCourses();
    const AdherentsCourse = { async create() { throw new Error("ne doit pas être appelé"); } };
    const Utilisateurs = { async findByPk() { return null; } };
    const res = await appeler(suggestion, { body: corpsCourse({ date: "2026-09-27", etatInteressementUtilisateur: "participe" }), Courses, AdherentsCourse, Utilisateurs, idUtilisateur: 1 });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
    assert.equal(Courses.crees.length, 0);
    assert.equal(mailsEnvoyes.length, 0);
});

test("suggestion : une course la veille est refusée sans mail", async () => {
    figerHorloge();
    const Courses = fauxCourses();
    const res = await appeler(suggestion, { body: corpsCourse({ date: "2026-09-26" }), Courses, Utilisateurs: {}, idUtilisateur: 1 });
    assert.equal(res.corps.detail.detail, "Date invalide.");
    assert.equal(Courses.crees.length, 0);
    assert.equal(mailsEnvoyes.length, 0);
});

test("supprimerCourse : course inexistante, 404", async () => {
    const Courses = { async findOne() { return null; }, async destroy() { throw new Error("ne doit pas être appelé"); } };
    const res = await appeler(supprimerCourse, { body: { nom: "Inconnue" }, Courses });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("modifierInteressement : course inexistante, 404", async () => {
    const Courses = { async findByPk() { return null; } };
    const AdherentsCourse = { async upsert() { throw new Error("ne doit pas être appelé"); } };
    const res = await appeler(modifierInteressement, { body: { idCourse: 999, nouvelEtat: "participe" }, Courses, AdherentsCourse, idUtilisateur: 1 });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});
// Validation de enregistrerCourses

test("cree : champ obligatoire manquant ou inscriptionsOuvertes non booléen, 400", async () => {
    figerHorloge();
    for (const valeurs of [{ date: "2026-10-10", nom: "" }, { date: "2026-10-10", inscriptionsOuvertes: "oui" }, {}]) {
        const { res, Courses } = await creer(valeurs);
        assert.equal(res.statut, 400);
        assert.equal(Courses.crees.length, 0);
    }
});

test("cree : date mal formée ou inexistante refusée", async () => {
    figerHorloge();
    for (const date of ["10/10/2026", "2026-02-30"]) {
        const { res } = await creer({ date });
        assert.deepEqual(res.corps, { etat: true, detail: { course: false, detail: "Date invalide." } });
    }
});

test("cree : type non autorisé refusé", async () => {
    figerHorloge();
    const { res, Courses } = await creer({ date: "2026-10-10", type: "Ultra" });
    assert.deepEqual(res.corps, { etat: true, detail: { course: false, detail: "Type de course invalide." } });
    assert.equal(Courses.crees.length, 0);
});

test("cree : lien non http(s) refusé", async () => {
    figerHorloge();
    const { res, Courses } = await creer({ date: "2026-10-10", lienSite: "javascript:alert(1)" });
    assert.deepEqual(res.corps, { etat: true, detail: { course: false, detail: "Un des liens est invalide." } });
    assert.equal(Courses.crees.length, 0);
});

test("cree : Trail sans distance numérique refusé", async () => {
    figerHorloge();
    const { res, Courses } = await creer({ date: "2026-10-10", type: "Trail", distance: "loin" });
    assert.deepEqual(res.corps, { etat: true, detail: { course: false, detail: "La distance doit être un nombre." } });
    assert.equal(Courses.crees.length, 0);
});

test("cree : succès, champs facultatifs vides enregistrés à null", async () => {
    figerHorloge();
    const { res, Courses } = await creer({ date: "2026-10-10", type: "Trail", distance: "25", lienSite: "", lienInscription: "https://exemple.fr" });
    assert.equal(res.corps.detail.notification, "Course crée avec succès !");
    assert.deepEqual(Courses.crees[0], {
        etat: "valider",
        nom: "Foulées",
        date: "2026-10-10",
        lieu: "Vincennes",
        distance: "25",
        type: "Trail",
        lienWhatsapp: null,
        lienSite: null,
        lienInscription: "https://exemple.fr",
        inscriptionsOuvertes: true,
        dateOuvertureInscription: null,
    });
});

test("modifierCourse : mise à jour par nom", async () => {
    figerHorloge();
    const Courses = {
        ...fauxCourses(),
        misesAJour: [],
        async update(donnees, options) {
            this.misesAJour.push({ donnees, options });
            return [1];
        },
    };
    const res = await appeler(modifierCourse, { body: corpsCourse({ date: "2026-10-10" }), Courses });
    assert.equal(res.corps.detail.notification, "Course modifiée avec succès !");
    assert.equal(Courses.crees.length, 0);
    assert.deepEqual(Courses.misesAJour[0].options, { where: { nom: "Foulées" } });
    assert.equal(Courses.misesAJour[0].donnees.etat, "valider");
});

test("modifierCourse : validation identique à la création (400)", async () => {
    const res = await appeler(modifierCourse, { body: { nom: "Foulées" }, Courses: {} });
    assert.equal(res.statut, 400);
});

test("suggestion : intérêt de l'auteur enregistré sur la course créée", async () => {
    figerHorloge();
    const Courses = fauxCourses();
    const AdherentsCourse = {
        crees: [],
        async create(donnees) {
            this.crees.push(donnees);
        },
    };
    const Utilisateurs = {
        async findByPk() {
            return { prenom: "Eloi", nom: "Test" };
        },
    };
    const body = corpsCourse({ date: "2026-10-10", etatInteressementUtilisateur: "participe" });
    await appeler(suggestion, { body, Courses, AdherentsCourse, Utilisateurs, idUtilisateur: 4 });
    assert.deepEqual(AdherentsCourse.crees, [{ idAdherent: 4, idCourse: 1, statut: "participe" }]);
});

test("supprimerCourse : succès, liste renvoyée", async () => {
    const Courses = {
        ...fauxCourses(),
        detruits: [],
        async findOne() {
            return { nom: "Foulées" };
        },
        async destroy(options) {
            this.detruits.push(options);
        },
    };
    const res = await appeler(supprimerCourse, { body: { nom: "Foulées" }, Courses });
    assert.deepEqual(res.corps, { etat: true, detail: [] });
    assert.deepEqual(Courses.detruits, [{ where: { nom: "Foulées" } }]);
});

// Intéressement

const fauxAdherentsCourse = () => ({
    upserts: [],
    async upsert(donnees) {
        this.upserts.push(donnees);
    },
});
const coursesAvec = (course) => ({
    ...fauxCourses(),
    async findByPk() {
        return course;
    },
});

test("modifierInteressement : état absent ou inconnu, 400", async () => {
    for (const body of [{ idCourse: 1 }, { nouvelEtat: "participe" }, { idCourse: 1, nouvelEtat: "peut-etre" }, { idCourse: 1, nouvelEtat: null }]) {
        const AdherentsCourse = fauxAdherentsCourse();
        const res = await appeler(modifierInteressement, { body, Courses: coursesAvec({ id: 1, etat: "valider" }), AdherentsCourse, idUtilisateur: 1 });
        assert.equal(res.statut, 400);
        assert.equal(AdherentsCourse.upserts.length, 0);
    }
});

test("modifierInteressement : course en suggestion, 403", async () => {
    const AdherentsCourse = fauxAdherentsCourse();
    const res = await appeler(modifierInteressement, { body: { idCourse: 1, nouvelEtat: "participe" }, Courses: coursesAvec({ id: 1, etat: "suggestion" }), AdherentsCourse, idUtilisateur: 1 });
    assert.equal(res.statut, 403);
    assert.equal(AdherentsCourse.upserts.length, 0);
});

test("modifierInteressement : participe et interesse enregistrés tels quels", async () => {
    for (const nouvelEtat of ["participe", "interesse"]) {
        const AdherentsCourse = fauxAdherentsCourse();
        const res = await appeler(modifierInteressement, { body: { idCourse: 3, nouvelEtat }, Courses: coursesAvec({ id: 3, etat: "valider" }), AdherentsCourse, idUtilisateur: 5 });
        assert.deepEqual(res.corps, { etat: true, detail: [] });
        assert.deepEqual(AdherentsCourse.upserts, [{ idAdherent: 5, idCourse: 3, statut: nouvelEtat }]);
    }
});

test('modifierInteressement : "null" retire l\'intérêt (statut null)', async () => {
    const AdherentsCourse = fauxAdherentsCourse();
    await appeler(modifierInteressement, { body: { idCourse: 3, nouvelEtat: "null" }, Courses: coursesAvec({ id: 3, etat: "valider" }), AdherentsCourse, idUtilisateur: 5 });
    assert.deepEqual(AdherentsCourse.upserts, [{ idAdherent: 5, idCourse: 3, statut: null }]);
});

// Liste des courses

const courseBdd = (donnees) => ({ toJSON: () => structuredClone(donnees) });

test("toutesLesCourses : connecté, statut personnel et participants renvoyés", async () => {
    const adherent = (id, statut) => ({ statut, adherent: { id, nom: "N" + id, prenom: "P" + id, cheminTrombinoscope: null } });
    const Courses = {
        options: null,
        async findAll(options) {
            this.options = options;
            return [courseBdd({ id: 1, nom: "Foulées", adherentsCourses: [adherent(5, "participe"), adherent(6, "interesse")] })];
        },
    };
    const res = await appeler(toutesLesCourses, { Courses, AdherentsCourse: {}, Utilisateurs: {}, idUtilisateur: 5 });
    const [course] = res.corps.detail;
    assert.equal(course.etatInteressementUtilisateur, "participe");
    assert.deepEqual(
        course.listePersonnes.map((p) => [p.id, p.statut]),
        [
            [5, "participe"],
            [6, "interesse"],
        ],
    );
    assert.equal("adherentsCourses" in course, false);
    assert.ok(Courses.options.attributes.includes("lienWhatsapp"));
    assert.deepEqual(Courses.options.where, { etat: "valider" });
});

test("toutesLesCourses : anonyme, ni lien WhatsApp ni participants", async () => {
    const Courses = {
        options: null,
        async findAll(options) {
            this.options = options;
            return [courseBdd({ id: 1, nom: "Foulées" })];
        },
    };
    const res = await appeler(toutesLesCourses, { Courses });
    const [course] = res.corps.detail;
    assert.equal(course.etatInteressementUtilisateur, null);
    assert.deepEqual(course.listePersonnes, []);
    assert.equal(Courses.options.attributes.includes("lienWhatsapp"), false);
    assert.deepEqual(Courses.options.include, []);
});

test("modifierCourse : aucune course de ce nom, 404 sans message de succès", async () => {
    figerHorloge();
    const Courses = {
        ...fauxCourses(),
        async update() {
            return [0];
        },
    };
    const res = await appeler(modifierCourse, { body: corpsCourse({ nom: "Inconnue", date: "2026-10-10" }), Courses });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("suggestion : compte supprimé entre-temps, 403 sans mail", async () => {
    figerHorloge();
    const Utilisateurs = { async findByPk() { return null; } };
    const res = await appeler(suggestion, { body: corpsCourse({ date: "2026-10-10" }), Courses: fauxCourses(), Utilisateurs, idUtilisateur: 1 });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
    assert.equal(mailsEnvoyes.length, 0);
});
