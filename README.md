# Biometric Login Showcase

A demo web app showcasing [WebAuthn](https://webauthn.io/) biometric authentication (fingerprint, Face ID, Windows Hello) using:

- **[SimpleWebAuthn](https://simplewebauthn.dev/)** v13 (browser + server)
- **Express 4** + Node.js 20 backend
- **React 18** + Vite + Tailwind CSS frontend
- **SQLite** via `better-sqlite3` for persistence
- **npm workspaces** monorepo

---

## Quick Start

```bash
npm install
npm run dev
```

- Server: `http://localhost:3001`
- Client: `https://localhost:5173` (HTTPS required for WebAuthn)

> **Browser SSL warning:** You'll see a certificate warning because Vite uses a self-signed cert for dev HTTPS. Click "Advanced → Proceed" to continue.

---

## Usage

1. Open `https://localhost:5173`
2. Click **Register** and enter a username
3. Browser prompts for your biometric (fingerprint/Face ID/PIN)
4. After registration you're redirected to the Dashboard
5. Click **Sign Out**, then log back in with **Login with Biometric**

---

## Architecture

![BioAuth](./BioAuth.png)