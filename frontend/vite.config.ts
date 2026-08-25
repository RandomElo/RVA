import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
    // Charge les variables .env et les arguments transmis au build
    const env = loadEnv(mode, process.cwd(), "");

    // Cible du backend : vérifie env (loadEnv), process.env puis le fallback Docker
    const backendUrl = env.VITE_API_INTERNAL_URL || "http://backend:8100";
    // Liste des préfixes de routes API à rediriger
    const proxyRoutes = ["/utilisateurs", "/autres", "/articles", "/courses", "/statistiques", "/specialistes", "/fichiers", "/images", "/pages", "/helloasso"];

    // Génération dynamique de l'objet proxy
    const proxyConfig: Record<string, any> = {};
    proxyRoutes.forEach((route) => {
        proxyConfig[route] = {
            target: backendUrl,
            changeOrigin: true,
            secure: false,
        };
    });

    return {
        plugins: [
            react(),
            tailwindcss(),
            svgr({
                include: "**/*.svg?react",
            }),
        ],
        build: {
            chunkSizeWarningLimit: 800,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes("node_modules")) {
                            if (id.includes("@tiptap") || id.includes("turndown")) {
                                return "vendor-editor";
                            }
                            if (id.includes("recharts") || id.includes("d3")) {
                                return "vendor-charts";
                            }
                            if (id.includes("@react-oauth") || id.includes("@marsidev/react-turnstile") || id.includes("jwt-decode")) {
                                return "vendor-auth";
                            }
                            if (id.includes("dompurify") || id.includes("html2canvas-pro")) {
                                return "vendor-dom-utils";
                            }
                            if (id.includes("lucide-react")) {
                                return "vendor-icons";
                            }
                            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/") || id.includes("node_modules/react-helmet-async/")) {
                                return "vendor-react-core";
                            }
                            return "vendor-others";
                        }
                    },
                },
            },
        },
        server: {
            port: parseInt(env.VITE_PORT_APPLICATION),
            historyApiFallback: true,
            proxy: proxyConfig,
            host: "0.0.0.0",
            allowedHosts: true, // Désactive le blocage strict du header Host par Vite
            watch: {
                usePolling: true,
            },
            hmr: {
                host: "localhost", // Indique au navigateur Windows où joindre le WebSocket HMR
                clientPort: parseInt(env.VITE_PORT_APPLICATION),
            },
        },
        // Nécessaire pour Puppeteer et `vite preview` pendant la phase de prerendering
        preview: {
            port: parseInt(env.VITE_PRERENDER_PORT),
            host: true, // Recommandé en Docker pour autoriser les connexions entrantes
            proxy: proxyConfig,
        },
    };
});
