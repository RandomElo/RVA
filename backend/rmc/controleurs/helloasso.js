import {
    getAccessToken,
    getTokenUtilisateur,
    clientOAuth,
    setTokensUtilisateur,
    estConnecteHelloAsso,
    genererPKCE,
} from "../../fonctions/helloasso/clientHelloasso.js";
import gestionErreur from "../middlewares/gestionErreur.js";
import crypto from "crypto";

const NOM_COOKIE_STATE = "helloasso_oauth_state";
const NOM_COOKIE_VERIFIER = "helloasso_oauth_verifier";

const MAPPING_CATEGORIES = {
    adhesion: "Membership",
    evenement: "Event",
    don: "Donation",
    vente: "Shop",
    autre: "PaymentForm"
};

/** Nettoie et valide les champs personnalisés reçus du client */
function nettoyerChampsFormulaire(champs) {
    if (!Array.isArray(champs)) return [];

    return champs.map((champ) => {
        const estTypeChoix = ["choix_unique", "choix_multiple", "liste_deroulante"].includes(champ.type);
        const optionsNettoyees = estTypeChoix && Array.isArray(champ.options)
            ? champ.options.map((opt) => opt.trim()).filter(Boolean)
            : undefined;

        return {
            id: champ.id,
            label: champ.label.trim(),
            type: champ.type,
            obligatoire: Boolean(champ.obligatoire),
            ...(optionsNettoyees && { options: optionsNettoyees }),
        };
    });
}


/* ------------------------------------------------------------------ */
/*  CONTRÔLEURS CONNEXION                                             */
/* ------------------------------------------------------------------ */

// A. Redirection de l'admin vers HelloAsso
export const initerConnexionHelloAsso = (req, res) => {
    const state = crypto.randomBytes(24).toString("hex");
    const { verifier, challenge } = genererPKCE();

    const options = {
        httpOnly: true,
        secure: process.env.MODE === "production",
        sameSite: "lax",
        signed: true,
        maxAge: 5 * 60 * 1000,
    };
    res.cookie(NOM_COOKIE_STATE, state, options);
    res.cookie(NOM_COOKIE_VERIFIER, verifier, options);

    const params = new URLSearchParams({
        client_id: process.env.HELLOASSO_CLIENT_ID,
        redirect_uri: process.env.HELLOASSO_REDIRECT_URI, // pas encodé ici, URLSearchParams s'en charge
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
    });

    res.redirect(`${HELLOASSO_AUTH_URL}/authorize?${params.toString()}`);
};

// B. Callback d'autorisation (réception du code) — ouvert dans une popup,
// on répond en HTML pour prévenir la fenêtre parente puis se fermer.
export const callbackHelloAsso = gestionErreur(async (req, res) => {
    const { code, state, error, error_description } = req.query;

    const stateAttendu = req.signedCookies?.[NOM_COOKIE_STATE];
    const codeVerifier = req.signedCookies?.[NOM_COOKIE_VERIFIER];
    res.clearCookie(NOM_COOKIE_STATE);
    res.clearCookie(NOM_COOKIE_VERIFIER);

    const envoyerPage = (succes, message) => {
        const origineFrontend = process.env.FRONTEND_URL;
        res.status(200).send(`
            <!DOCTYPE html>
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage(
                      { type: "helloasso-oauth", succes: ${JSON.stringify(succes)}, message: ${JSON.stringify(message)} },
                      ${JSON.stringify(origineFrontend)}
                    );
                  }
                  window.close();
                </script>
                <p>${message}</p>
              </body>
            </html>
        `);
    };

    if (error) {
        return envoyerPage(false, `Erreur HelloAsso : ${error_description || error}`);
    }
    if (!code) {
        return envoyerPage(false, "Code d'autorisation manquant.");
    }
    if (!state || !stateAttendu || state !== stateAttendu) {
        return envoyerPage(false, "Requête OAuth invalide ou expirée.");
    }

    try {
        const accessToken = await clientOAuth.getToken({
            code,
            redirect_uri: process.env.HELLOASSO_REDIRECT_URI,
            code_verifier: codeVerifier,
        });
        setTokensUtilisateur(accessToken.token);
        envoyerPage(true, "Connexion HelloAsso réussie ! Vous pouvez fermer cette fenêtre.");
    } catch (erreur) {
        envoyerPage(false, "Échec de la connexion HelloAsso : " + erreur.message);
    }
}, "callbackHelloAsso", "Erreur lors de la récupération du token utilisateur");

// C. Statut de connexion (utilisé par le frontend pour afficher l'état)
export const statutConnexionHelloAsso = (req, res) => {
    res.status(200).json({ etat: true, detail: estConnecteHelloAsso() });
};

/* ------------------------------------------------------------------ */
/*  CONTRÔLEURS                                                       */
/* ------------------------------------------------------------------ */

// 1. Récupérer tous les formulaires de l'association
export const recuperationForms = gestionErreur(async (req, res) => {
    const token = await getAccessToken();
    const slug = process.env.HELLOASSO_SLUG;

    const response = await fetch(
        `${process.env.HELLOASSO_BASE_URL}/v5/organizations/${slug}/forms`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (!response.ok) {
        throw new Error(`Erreur API HelloAsso: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json({ etat: true, detail: data });
}, "controleurRecuperationFormulaires", "Erreur lors de la récupération des formulaires HelloAsso");

// 2. Récupérer les détails d'un formulaire spécifique
export const recuperationFormulaireParSlug = gestionErreur(async (req, res) => {
    const { formType, formSlug } = req.params;
    const token = await getAccessToken();
    const slug = process.env.HELLOASSO_SLUG;

    const response = await fetch(
        `${process.env.HELLOASSO_BASE_URL}/v5/organizations/${slug}/forms/${formType}/${formSlug}/public`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API HelloAsso (${response.status}) : ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json({ etat: true, detail: data });
}, "controleurRecuperationFormulaireParSlug", "Erreur lors de la récupération du détail du formulaire");

// 3. Récupérer les réponses d'un formulaire (GET /helloasso/items/:formType/:formSlug)
export const recuperationReponsesFormulaire = gestionErreur(async (req, res) => {
    const { formType, formSlug } = req.params;
    const token = await getAccessToken();
    const slug = process.env.HELLOASSO_SLUG;

    const pageIndex = req.query.pageIndex || 1;
    const pageSize = req.query.pageSize || 50;

    const response = await fetch(
        `${process.env.HELLOASSO_BASE_URL}/v5/organizations/${slug}/forms/${formType}/${formSlug}/items?pageIndex=${pageIndex}&pageSize=${pageSize}&withDetails=true`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API HelloAsso (${response.status}) : ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json({ etat: true, detail: data });
}, "controleurRecuperationReponsesFormulaire", "Erreur lors de la récupération des réponses du formulaire");

// 4. Initialiser une intention de paiement (Checkout Intent)
export const initialiserPaiement = gestionErreur(async (req, res) => {
    const { totalAmount, initialAmount, title, returnUrl, errorUrl, backUrl, payer } = req.body;
    const token = await getAccessToken();
    const slug = process.env.HELLOASSO_SLUG;

    const bodyData = {
        totalAmount,
        initialAmount,
        itemName: title,
        backUrl,
        errorUrl,
        returnUrl,
        containsDonation: false,
        payer: {
            firstName: payer.firstName,
            lastName: payer.lastName,
            email: payer.email
        },
        metadata: req.body.metadata || {}
    };

    const response = await fetch(
        `${process.env.HELLOASSO_BASE_URL}/v5/organizations/${slug}/checkout-intents`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        }
    );

    if (!response.ok) {
        throw new Error(`Erreur d'initialisation du paiement: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(201).json(data);
}, "controleurInitialiserPaiement", "Erreur lors de la création de l'intention de paiement");

// 5. Récupérer les détails d'un paiement spécifique via son ID
export const recuperationPaiementParId = gestionErreur(async (req, res) => {
    const { checkoutIntentId } = req.params;
    const token = await getAccessToken();

    const response = await fetch(
        `${process.env.HELLOASSO_BASE_URL}/v5/payments/${checkoutIntentId}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (!response.ok) {
        throw new Error(`Impossible de récupérer le paiement ID ${checkoutIntentId}`);
    }

    const data = await response.json();
    res.status(200).json(data);
}, "controleurRecuperationPaiementParId", "Erreur lors de la récupération du paiement");

// 6. Récupérer la liste de toutes les commandes passées
export const recuperationCommandes = gestionErreur(async (req, res) => {
    const token = await getAccessToken();
    const slug = process.env.HELLOASSO_SLUG;

    const pageIndex = req.query.pageIndex || 1;
    const pageSize = req.query.pageSize || 20;

    const response = await fetch(
        `${process.env.HELLOASSO_BASE_URL}/v5/organizations/${slug}/orders?pageIndex=${pageIndex}&pageSize=${pageSize}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des commandes: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
}, "controleurRecuperationCommandes", "Erreur lors de la récupération des commandes HelloAsso");

export const creerFormulaire = gestionErreur(async (req, res) => {
    const { nom, categorie, description, image, champs } = req.body;

    if (!nom || !nom.trim()) {
        return res.status(400).json({
            etat: false,
            detail: "Le nom du formulaire est obligatoire.",
        });
    }

    const token = await getTokenUtilisateur();

    const slug = process.env.HELLOASSO_SLUG;

    // Conversion de la catégorie FR vers le type API V5 HelloAsso
    const formTypeHelloAsso = MAPPING_CATEGORIES[categorie] || "PaymentForm";

    // URL officielle API V5
    const urlApi = `${process.env.HELLOASSO_BASE_URL}/v5/organizations/${slug}/forms/${formTypeHelloAsso}`;

    const bodyHelloAsso = {
        name: nom.trim(),
        description: description?.trim() || "",
        banner: image?.chemin || null,
        customFields: (champs || []).map((c) => ({
            name: c.label,
            type: c.type,
            isRequired: Boolean(c.obligatoire),
            options: c.options || [],
        })),
    };

    const response = await fetch(urlApi, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(bodyHelloAsso),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HelloAsso (${response.status}) sur ${urlApi} : ${errorText}`);
    }

    const donneeHelloAsso = await response.json();

    const nouveauFormulaire = {
        id: donneeHelloAsso.id || donneeHelloAsso.formSlug,
        slug: donneeHelloAsso.formSlug,
        nom: nom.trim(),
        categorie,
        description: description?.trim() || "",
        image: image || null,
        champs: champs || [],
    };

    const listeMiseAJour = req.formulairesStockes
        ? [...req.formulairesStockes, nouveauFormulaire]
        : [nouveauFormulaire];

    res.status(201).json({
        etat: true,
        detail: listeMiseAJour,
    });
}, "creerFormulaireHelloAsso", "Erreur lors de la création du formulaire HelloAsso");

// 2. Modifier un formulaire existant sur HelloAsso
export const modifierFormulaire = gestionErreur(async (req, res) => {
    const { id, slug: formSlug, nom, categorie, description, image, champs } = req.body;

    if (!id && !formSlug) {
        return res.status(400).json({
            etat: false,
            detail: "L'identifiant du formulaire est manquant.",
        });
    }

    const token = await getTokenUtilisateur();

    const meSlug = process.env.HELLOASSO_SLUG;
    const targetSlug = formSlug || id;

    const bodyHelloAsso = {
        name: nom.trim(),
        description: description?.trim() || "",
        banner: image?.chemin || null,
        customFields: nettoyerChampsFormulaire(champs).map((c) => ({
            name: c.label,
            type: c.type,
            isRequired: c.obligatoire,
            options: c.options || [],
        })),
    };

    const formTypeHelloAsso = MAPPING_CATEGORIES[categorie] || "PaymentForm";
    const response = await fetch(
        `${process.env.HELLOASSO_BASE_URL}/v5/organizations/${meSlug}/forms/${formTypeHelloAsso}/${targetSlug}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyHelloAsso),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HelloAsso (${response.status}) : ${errorText}`);
    }

    const formulaireModifie = {
        id: id || targetSlug,
        slug: targetSlug,
        nom: nom.trim(),
        categorie,
        description: description?.trim() || "",
        image: image || null,
        champs: nettoyerChampsFormulaire(champs),
    };

    const listeMiseAJour = (req.formulairesStockes || []).map((f) =>
        f.id === formulaireModifie.id ? formulaireModifie : f
    );

    res.status(200).json({
        etat: true,
        formulaire: formulaireModifie,
        notification: "Le formulaire a été mis à jour avec succès.",
        detail: listeMiseAJour,
    });
}, "modifierFormulaireHelloAsso", "Erreur lors de la modification du formulaire HelloAsso");
// 3. Supprimer un formulaire sur HelloAsso
export const supprimerFormulaire = gestionErreur(async (req, res) => {
    const { categorie, formSlug } = req.params;

    if (!categorie || !formSlug) {
        return res.status(400).json({
            etat: false,
            detail: "La catégorie et le slug du formulaire sont obligatoires.",
        });
    }

    const token = await getTokenUtilisateur();
    const slug = process.env.HELLOASSO_SLUG;

    const formTypeHelloAsso = MAPPING_CATEGORIES[categorie] || "PaymentForm";

    // Requête DELETE vers l'API HelloAsso v5
    const response = await fetch(
        `${process.env.HELLOASSO_BASE_URL}/v5/organizations/${slug}/forms/${formTypeHelloAsso}/${formSlug}`,
        {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HelloAsso (${response.status}) : ${errorText}`);
    }

    // Filtre la liste locale pour mettre à jour l'état côté client
    const listeMiseAJour = (req.formulairesStockes || []).filter(
        (f) => f.slug !== formSlug && f.id !== formSlug
    );

    res.status(200).json({
        etat: true,
        notification: "Le formulaire a été supprimé avec succès.",
        detail: listeMiseAJour,
    });
}, "supprimerFormulaireHelloAsso", "Erreur lors de la suppression du formulaire HelloAsso");