import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    css: {
        postcss: './postcss.config.js',
    },
    server: {

        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://localhost:9999',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:9999',
                changeOrigin: true,
            }
        }
    },
    envPrefix: ['VITE_', 'FIREBASE_', 'REACT_APP_'],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) {
                            return 'vendor-antd';
                        }
                        if (id.includes('firebase') || id.includes('@firebase')) {
                            return 'vendor-firebase';
                        }
                        if (id.includes('@google/generative-ai')) {
                            return 'vendor-ai';
                        }
                        if (id.includes('react') && !id.includes('lucide') && !id.includes('router')) {
                            return 'vendor-react';
                        }
                        if (id.includes('recharts')) {
                            return 'vendor-recharts';
                        }
                        if (id.includes('xlsx')) {
                            return 'vendor-xlsx';
                        }
                        if (id.includes('react-router-dom') || id.includes('react-router')) {
                            return 'vendor-router';
                        }
                        if (id.includes('lucide-react')) {
                            return 'vendor-lucide';
                        }
                        return 'vendor';
                    }
                }
            }
        }
    }
})
