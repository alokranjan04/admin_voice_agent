/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY,
        VITE_VAPI_PUBLIC_KEY: process.env.VITE_VAPI_PUBLIC_KEY,
        VITE_VAPI_PRIVATE_KEY: process.env.VITE_VAPI_PRIVATE_KEY,
        VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID,
        VITE_GOOGLE_CALENDAR_TOKEN: process.env.VITE_GOOGLE_CALENDAR_TOKEN,
        VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
        VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
        VITE_SERPER_API_KEY: process.env.VITE_SERPER_API_KEY,
    },
    // Suppress hydration warnings from Lucide/browser extensions
    compiler: {
        styledComponents: true,
    }
};

export default nextConfig;
