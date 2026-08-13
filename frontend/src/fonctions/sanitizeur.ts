import DOMPurify from "dompurify";

function estOrigineCanvaAutorisee(src: string): boolean {
    try {
        const u = new URL(src);
        return u.protocol === "https:" && u.hostname === "www.canva.com";
    } catch {
        return false;
    }
}

DOMPurify.addHook("uponSanitizeElement", (node) => {
    if (node.nodeName === "IFRAME") {
        const src = (node as HTMLIFrameElement).getAttribute("src") ?? "";

        if (!estOrigineCanvaAutorisee(src)) {
            node.parentNode?.removeChild(node);
        }
    }
});

export const contenuPropre = function (texte: string) {
    return DOMPurify.sanitize(texte, {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy"],
    });
};
