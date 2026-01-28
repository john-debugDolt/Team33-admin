import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  logLevel: 'info',
  clearScreen: true,
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    host: 'localhost',
    strictPort: true,
    proxy: {
      // Proxy Keycloak auth requests (for local development)
      '/auth/keycloak': {
        target: 'http://k8s-team33-keycloak-320152ed2f-65380cdab2265c8a.elb.ap-southeast-2.amazonaws.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth\/keycloak/, ''),
      },
      // Proxy chat API to external chat server
      '/api/chat': {
        target: 'https://k8s-team33-accounts-4f99fe8193-a4c5da018f68b390.elb.ap-southeast-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
      },
      // Proxy Accounts API to external server
      '/api/accounts': {
        target: 'https://k8s-team33-accounts-4f99fe8193-a4c5da018f68b390.elb.ap-southeast-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
      },
      // Proxy Deposits API to external server
      '/api/deposits': {
        target: 'https://k8s-team33-accounts-4f99fe8193-a4c5da018f68b390.elb.ap-southeast-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
      },
      // Proxy Withdrawals API to external server
      '/api/withdrawals': {
        target: 'https://k8s-team33-accounts-4f99fe8193-a4c5da018f68b390.elb.ap-southeast-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
      },
      // Proxy all Admin APIs to external server
      '/api/admin': {
        target: 'https://k8s-team33-accounts-4f99fe8193-a4c5da018f68b390.elb.ap-southeast-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
      },
      // Proxy Wallet API
      '/api/wallets': {
        target: 'https://k8s-team33-accounts-4f99fe8193-a4c5da018f68b390.elb.ap-southeast-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
      },
      // Proxy Banks API to external server
      '/api/banks': {
        target: 'https://k8s-team33-accounts-4f99fe8193-a4c5da018f68b390.elb.ap-southeast-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
      },
      // Proxy WebSocket for chat
      '/ws/chat': {
        target: 'wss://k8s-team33-accounts-4f99fe8193-a4c5da018f68b390.elb.ap-southeast-2.amazonaws.com',
        ws: true,
        changeOrigin: true,
      },
    }
  }
})
