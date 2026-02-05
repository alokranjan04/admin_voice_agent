# Voice AI Admin Configurator

An intelligent, AI-driven administration dashboard for configuring and deploying sophisticated Voice AI agents. This tool allows users to define business metadata, services, and behavioral rules, leveraging Google Gemini for automated configuration and VAPI for seamless voice agent deployment.

## 🚀 Key Features

- **AI-Powered Auto-Fill**: Instantly generate complete business configurations (services, FAQs, system prompts) based on a short description using Google Gemini.
- **Real-World Research Integration**: Connects to the web via **Serper.dev** to fetch actual business details, addresses, and industry-specific data, grounding the AI and preventing "hallucinations."
- **VAPI Integration**: Automated one-click deployment of Voice AI Assistants directly to the VAPI platform.
- **Dynamic Configuration Management**:
  - **Business Metadata**: Identity, Industry, and Use Case.
  - **Services**: Customizable offerings with durations and booking rules.
  - **Locations**: Physical or virtual settings.
  - **Behavior Rules**: Tone, style, and safety boundaries.
- **Firebase Persistence**: All configurations are securely saved and synced to Firebase.
- **One-Click Launch**: Automatically launches the Live Agent Interface upon successful configuration lock.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Vanilla CSS (Premium Dark/Indigo Aesthetics)
- **AI Engine**: Google Gemini Pro (@google/generative-ai)
- **Research API**: Serper.dev (Google Search/Places)
- **Voice Platform**: VAPI.ai
- **Backend/Database**: Firebase (Auth & Firestore)
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js (v18+)
- Firebase Project
- Google Gemini API Key
- VAPI Private Key
- Serper.dev API Key (Optional, for deep research)

## ⚙️ Environment Setup

Create a `.env` file in the root directory and add the following:

```env
# Gemini AI
VITE_GEMINI_API_KEY=your_gemini_key

# VAPI
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_VAPI_PRIVATE_KEY=your_vapi_private_key

# Serper (Search API)
VITE_SERPER_API_KEY=your_serper_key

# Firebase (Example - Replace with your config)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 🏃 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## 📂 Project Structure

- `/src`: Main application source code
- `/components`: Reusable UI components (Sidebar, Login, etc.)
- `/services`: Core logic for API integrations
  - `geminiService.ts`: AI generation logic
  - `vapiService.ts`: VAPI assistant deployment
  - `researchService.ts`: Web research via Serper
  - `firebase.ts`: Database and Auth
- `types.ts`: TypeScript interfaces for the agent configuration schema
- `App.tsx`: The heart of the configurator dashboard

## 🔐 Security Note

This is an administration tool. While it interacts with APIs directly from the frontend for simplicity in this local/internal version, in a public production environment, sensitive keys (VAPI Private Key, etc.) should be proxied through a secure backend to prevent exposure.
