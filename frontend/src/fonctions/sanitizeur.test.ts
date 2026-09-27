import { describe, expect, it } from "vitest";

import { contenuPropre } from "./sanitizeur";

const IFRAME_CANVA = '<iframe src="https://www.canva.com/design/DAF123/view?embed" allowfullscreen="" loading="lazy"></iframe>';

describe("contenuPropre", () => {
    it("supprime les balises <script>", () => {
        const resultat = contenuPropre("<p>Bonjour</p><script>alert(1)</script>");

        expect(resultat).toBe("<p>Bonjour</p>");
    });

    it("supprime les gestionnaires d'événements inline", () => {
        const resultat = contenuPropre('<img src="x.png" onerror="alert(1)"><p onclick="alert(2)">Texte</p>');

        expect(resultat).not.toContain("onerror");
        expect(resultat).not.toContain("onclick");
        expect(resultat).toContain('<img src="x.png">');
        expect(resultat).toContain("<p>Texte</p>");
    });

    it("supprime les liens javascript:", () => {
        const resultat = contenuPropre('<a href="javascript:alert(1)">Clic</a>');

        expect(resultat).not.toContain("javascript:");
        expect(resultat).toBe("<a>Clic</a>");
    });

    it("conserve les liens https et la mise en forme simple", () => {
        const html = '<p><b>Gras</b> et <a href="https://example.com">lien</a></p>';

        expect(contenuPropre(html)).toBe(html);
    });

    it("conserve une iframe Canva avec ses attributs autorisés", () => {
        const resultat = contenuPropre(IFRAME_CANVA);

        expect(resultat).toContain("<iframe");
        expect(resultat).toContain('src="https://www.canva.com/design/DAF123/view?embed"');
        expect(resultat).toContain("allowfullscreen");
        expect(resultat).toContain('loading="lazy"');
    });

    it("supprime les iframes d'une autre origine", () => {
        expect(contenuPropre('<iframe src="https://evil.example.com/"></iframe>')).toBe("");
        expect(contenuPropre('<iframe src="https://www.canva.com.evil.example.com/"></iframe>')).toBe("");
        expect(contenuPropre('<iframe src="http://www.canva.com/design/x"></iframe>')).toBe("");
    });

    it("supprime les iframes sans src ou en javascript:", () => {
        expect(contenuPropre("<iframe></iframe>")).toBe("");
        expect(contenuPropre('<iframe src="javascript:alert(1)"></iframe>')).toBe("");
    });

    it("retire l'attribut srcdoc d'une iframe Canva", () => {
        const resultat = contenuPropre('<iframe src="https://www.canva.com/design/x" srcdoc="<script>alert(1)</script>"></iframe>');

        expect(resultat).not.toContain("srcdoc");
        expect(resultat).not.toContain("<script");
    });
});
