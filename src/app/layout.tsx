import type { Metadata } from "next";
import { Inter, DM_Sans, Sora } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import "./globals.css";

const dmSans = DM_Sans({ 
    subsets: ["latin"],
    variable: '--font-dm-sans'
});

const sora = Sora({ 
    subsets: ["latin"],
    variable: '--font-sora'
});

export const metadata: Metadata = {
    title: "Sutherland | Enterprise Voice AI Platform",
    description: "The Agentic Enterprise Starts Here. Generate Your AI Agent in 60 Seconds.",
};

import Script from "next/script";

// ...

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${dmSans.variable} ${sora.variable} font-sans`}>
                <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
                {children}
                <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX'} />
            </body>
        </html>
    );
}
