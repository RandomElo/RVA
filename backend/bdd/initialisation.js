import bdd from "./bdd.js";

export async function ajouterDonneesInitiales() {
    try {
        const [administrateurExiste, adherantExiste, images, pages] = await Promise.all([
            bdd.Utilisateurs.findAll({ where: { role: "administrateur" } }),
            bdd.Utilisateurs.findOne({ where: { role: "adherent" } }),
            bdd.Images.findAll({ where: { type: "systeme" } }),
            bdd.Pages.findAll({ where: { modifiable: false } })
        ]);

        if (administrateurExiste.length === 0) {
            console.log("⚠️ Aucun administrateur enregistré, création...");

            await bdd.Utilisateurs.bulkCreate([
                {
                    prenom: "Bureau",
                    nom: "Administrateur",
                    mail: process.env.EMAIL_ADMINISTRATEUR,
                    motDePasse: process.env.MDP_ADMINISTRATEUR,
                    dateNaissance: "16/10",
                    role: "administrateur"
                },
                {
                    prenom: "Bureau",
                    nom: "Dépannage",
                    mail: process.env.EMAIL_ADMINISTRATEUR2,
                    motDePasse: process.env.MDP_ADMINISTRATEUR,
                    dateNaissance: "16/10",
                    role: "administrateur"
                },
            ]);
        }

        if (!adherantExiste) {
            console.log("⚠️ Aucun adhérent enregistré, création...");

            await bdd.Utilisateurs.create({
                prenom: "Eloi",
                nom: "Bontron",
                mail: process.env.EMAIL_ADHERENT,
                role: "adherent"
            });
        }

        if (images.length === 0) {
            console.log("⚠️ Insertion des images système...");
            await bdd.Images.bulkCreate([
                { alt: "Bannière accueil : photo de groupe", nomFichier: "banniere.webp", type: "systeme" },
                { alt: "Photo de Thomas Hairault : le coach", nomFichier: "thomas.webp", type: "systeme" },
            ]);
        }

        if (pages.length === 0) {
            console.log("⚠️ Insertion des pages système...");
            await bdd.Pages.bulkCreate([
                // --- ROUTES PUBLIQUES ---
                { titre: "Running Vincennes Association (RVA)", url: "/", modifiable: false },
                { titre: "Histoire & Présentation du Club", url: "/notre-histoire", modifiable: false },
                { titre: "Contact & Adhésion", url: "/contactez-nous", modifiable: false },
                { titre: "Nos partenaires", url: "/nos-partenaires", modifiable: false },
                { titre: "Calendrier des courses à pied & trails 2026", url: "/calendrier", modifiable: false },
                { titre: "Blog", url: "/blog", modifiable: false },
                { titre: "Connexion", url: "/connexion", modifiable: false },

                // Ressources Publiques
                { titre: "Guides & Ressources d'Entraînement Running", url: "/ressources", modifiable: false },
                { titre: "Générateur de plan d'entraînement running personnalisé", url: "/ressources/plan-entrainement", modifiable: false },
                { titre: "Test VMA Mercier et Vameval : calcul et explications", url: "/ressources/tests-vma", modifiable: false },
                { titre: "Calculateur d'allures de course selon la VMA", url: "/ressources/vma", modifiable: false },
                { titre: "Lexique & Vocabulaire de la Course à Pied", url: "/ressources/lexique", modifiable: false },

                // --- ROUTES ADHÉRENTS (Protégées) ---
                { titre: "Spécialistes & Recommandations", url: "/ressources/specialistes-sante", modifiable: false },
                { titre: "Trombinoscope", url: "/ressources/trombinoscope", modifiable: false },
                { titre: "Rédaction article", url: "/rediger-article", modifiable: false },

                // --- ROUTES ADMINISTRATEUR (Protégées) ---
                { titre: "Administration", url: "/administration", modifiable: false },
                { titre: "Gestion blog", url: "/administration/blog", modifiable: false },
                { titre: "Gestion courses", url: "/administration/courses", modifiable: false },
                { titre: "Gestion adhérents", url: "/administration/adherents", modifiable: false },
                { titre: "Gestion spécialistes santé", url: "/administration/specialistes-sante", modifiable: false },
                { titre: "Statistiques", url: "/administration/statistiques", modifiable: false },
                { titre: "Gestion des images", url: "/administration/images", modifiable: false },
                { titre: "Gestion des pages", url: "/administration/pages", modifiable: false },

                // --- PAGES LÉGALES ---
                { titre: "Mentions légales", url: "/mentions-legales", modifiable: false },
                { titre: "Politique de confidentialité", url: "/politique-confidentialite", modifiable: false },
                { titre: "CGU", url: "/cgu", modifiable: false },
                { titre: "Crédits", url: "/credits", modifiable: false }
            ]);
        }

        console.log("✅ Insertion des données initiales terminée");
    } catch (err) {
        console.error("❌ Erreur lors de l'insertion des données initiales :", err);
    } finally {
        // Ferme la connexion à la BDD pour libérer la boucle d'événements Node.js
        if (bdd.sequelize) {
            await bdd.sequelize.close();
        } else if (bdd.close) {
            await bdd.close();
        }
        process.exit(0);
    }
}

// Exécution de la fonction
ajouterDonneesInitiales();