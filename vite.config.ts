import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Force React to resolve to a single instance
const reactPath = path.resolve(__dirname, 'node_modules/react');
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    },
    hmr: {
      overlay: true,
      port: 5173
    },
    watch: {
      usePolling: false
    }
  },
  plugins: [
    react()
  ],
  cacheDir: mode === 'development' ? undefined : '.vite',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'react': reactPath,
      'react-dom': reactDomPath
    },
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      target: 'es2020',
      logLevel: 'error'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'chart-vendor': ['recharts']
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Optimize asset inline limit
    assetsInlineLimit: 4096
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://kozhlejudselgtmohdfm.supabase.co"),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M"),
    'import.meta.env.VITE_PAYSTACK_PUBLIC_KEY': JSON.stringify("pk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668"),
    'import.meta.env.VITE_VAPID_PUBLIC_KEY': JSON.stringify("BIW-d8PrcYplSuMQz6q2E_92UKW2mv7t_oF9mT3k37Oo0vq9ToZbFr6bCWiD_sLMqiySypc23dsqlwwRp86oZBo"),
  },
  publicDir: 'public',
}));
