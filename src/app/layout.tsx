import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Voice AI Admin Configurator",
    description: "Automated Setup & Training for Voice AI Agents",
};

import Script from "next/script";

// ...

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
                {children}
            </body>
        </html>
    );
}
