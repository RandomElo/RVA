import ImageExtension from "@tiptap/extension-image";

export const ImagePersonnalisee = ImageExtension.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: "100%",
                parseHTML: (element) => element.style.width || "100%",
                renderHTML: (attributes) => {
                    if (!attributes.width) return {};
                    return {
                        style: `width: ${attributes.width}`,
                    };
                },
            },
        };
    },
});
