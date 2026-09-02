import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const backendUrl = env.VITE_API_INTERNAL_URL || "http://backend:8100";
    const proxyRoutes = ["/utilisateurs", "/autres", "/articles", "/courses", "/statistiques", "/specialistes", "/fichiers", "/images", "/pages", "/helloasso"];

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
            chunkSizeWarningLimit: 500,

            target: "es2022",
            minify: "oxc",
            cssCodeSplit: true,
            cssMinify: true,

            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes("node_modules")) {
                            if (id.includes("@tiptap") || id.includes("turndown") || id.includes("prosemirror")) {
                                return "vendor-editor";
                            }
                            if (id.includes("recharts") || id.includes("d3-") || id.includes("d3")) {
                                return "vendor-charts";
                            }
                            if (id.includes("html2canvas") || id.includes("dompurify")) {
                                return "vendor-dom-utils";
                            }
                            if (id.includes("@react-oauth") || id.includes("turnstile") || id.includes("jwt-decode")) {
                                return "vendor-auth";
                            }
                            if (id.includes("lucide-react")) {
                                return "vendor-icons";
                            }
                            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router") || id.includes("node_modules/scheduler/")) {
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
