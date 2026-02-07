# Voice AI Admin Configurator (Next.js Edition)

An intelligent, full-stack administration dashboard for configuring and deploying sophisticated Voice AI agents. This tool allows users to define business metadata, services, and behavioral rules, leveraging Google Gemini for automated configuration, VAPI for voice agent deployment, and Stripe for secure organization-level billing.

## 🚀 Key Features

- **Full-Stack Next.js Architecture**: Unified frontend and backend for secure API operations.
- **AI-Powered Auto-Fill**: Instantly generate complete business configurations using Google Gemini.
- **Stripe Billing Integration**: Built-in subscription management and automated plan upgrades via Webhooks.
- **Real-World Research Integration**: Connects to the web via **Serper.dev** to fetch actual business details.
- **VAPI Assistant Deployment**: One-click creation of Voice AI Assistants.
- **White-Label Branding**: Persist organization-specific logos and themes using CSS variables.

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS
- **AI Engine**: Google Gemini Pro
- **Research API**: Serper.dev
- **Voice Platform**: VAPI.ai
- **Backend/Database**: Firebase (Admin SDK, Auth & Firestore)
- **Billing**: Stripe (Node.js SDK & Webhooks)

## 📋 Prerequisites

- Node.js (v18+)
- Stripe Account (for Secret Key & Webhooks)
- Firebase Project (with Admin SDK access)
- Google Gemini & VAPI API Keys

## ⚙️ Environment Setup

Use the provided `.env.example` as a template for your `.env.local` file.

```env
# Firebase
VITE_FIREBASE_PROJECT_ID=...
# Gemini, VAPI, Serper...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🏃 Getting Started

1. **Install dependencies**: `npm install`
2. **Run dev server**: `npm run dev`
3. **Build & Deploy**: `npm run build`

## 📂 Project Structure

- `/src/app`: Routes and Layouts (Next.js)
- `/src/app/api`: Stripe Checkout & Webhook endpoints
- `/src/components`: UI components (Sidebar, Dashboard)
- `/src/services`: API Client services (Firebase, VAPI, Gemini)
- `/src/lib`: Server-side initializers (Stripe, Firebase Admin)
- `/src/types`: Shared TypeScript definitions

## 🔐 Security

Critical API keys (Stripe Secret, Firebase Admin) are now managed on the **server-side** via Next.js API Routes, significantly improving the security posture of the administration tool compared to the previous client-side version.
