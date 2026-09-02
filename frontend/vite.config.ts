import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const backendUrl = env.VITE_API_INTERNAL_URL || "http://backend:8100";
    const proxyRoutes = [
        "/utilisateurs", "/autres", "/articles", "/courses", 
        "/statistiques", "/specialistes", "/fichiers", "/images", 
        "/pages", "/helloasso"
    ];

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
            // Seuil de warning baissé pour mieux surveiller la taille
            chunkSizeWarningLimit: 500,
            
            // Suppression des commentaires et minification agressive
            target: "es2022",
            minify: "esbuild",
            cssMinify: true,
            
            rollupOptions: {
                output: {
                    // Nettoie la liste des préchargements HTML pour éviter de télécharger 
                    // les chunks qui ne servent qu'aux pages dynamiques/lazy-loaded
                    experimentalMinChunkSize: 10000,
                    
                    manualChunks(id) {
                        if (id.includes("node_modules")) {
                            // L'éditeur Tiptap et Turndown (Lourd -> Lazy-loaded sur la page dédiée)
                            if (id.includes("@tiptap") || id.includes("turndown") || id.includes("prosemirror")) {
                                return "vendor-editor";
                            }
                            // Graphiques et cartes (Lourd -> Lazy-loaded)
                            if (id.includes("recharts") || id.includes("d3-") || id.includes("d3")) {
                                return "vendor-charts";
                            }
                            // Outils d'export / DOM
                            if (id.includes("html2canvas") || id.includes("dompurify")) {
                                return "vendor-dom-utils";
                            }
                            // Authentification et sécurité
                            if (id.includes("@react-oauth") || id.includes("turnstile") || id.includes("jwt-decode")) {
                                return "vendor-auth";
                            }
                            // Icônes
                            if (id.includes("lucide-react")) {
                                return "vendor-icons";
                            }
                            // Core React (Indispensable immédiatement)
                            if (
                                id.includes("node_modules/react/") || 
                                id.includes("node_modules/react-dom/") || 
                                id.includes("node_modules/react-router") ||
                                id.includes("node_modules/scheduler/")
                            ) {
                                return "vendor-react-core";
                            }
                        }
                    },
                },
            },
        },
        server: {
            port: parseInt(env.VITE_PORT_APPLICATION || "3000"),
            historyApiFallback: true,
            proxy: proxyConfig,
            host: "0.0.0.0",
            allowedHosts: true,
            watch: {
                usePolling: true,
            },
            hmr: {
                host: "localhost",
                clientPort: parseInt(env.VITE_PORT_APPLICATION || "3000"),
            },
        },
        preview: {
            port: parseInt(env.VITE_PRERENDER_PORT || "3001"),
            host: true,
            proxy: proxyConfig,
        },
    };
});