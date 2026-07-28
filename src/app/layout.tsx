import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { CadreApplication } from "@/components/cadre-application";
import { FournisseurAuth } from "@/lib/auth";
import { FournisseurToast } from "@/components/toast";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FORGE — Entraînement et nutrition sur mesure",
    template: "%s · FORGE",
  },
  description:
    "Générateur de programmes de callisthénie, endurance, nutrition et hydratation, "
    + "calculés à partir du profil, de l'agenda et du matériel disponible.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FORGE",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icones/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // L'application est dense : on autorise le zoom, indispensable pour
  // l'accessibilité, mais on évite le zoom involontaire au double-tap.
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceae4" },
    { media: "(prefers-color-scheme: dark)", color: "#141d1d" },
  ],
};

/**
 * Applique le thème avant le premier rendu pour éviter un flash clair
 * au chargement d'une page en mode sombre.
 */
const SCRIPT_THEME = `
(function(){
  try {
    var t = localStorage.getItem("forge-theme");
    if (!t) t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    if (t === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className={`${geist.variable} antialiased`}>
        <FournisseurAuth>
          <ThemeProvider>
            <FournisseurToast>
              <CadreApplication>{children}</CadreApplication>
            </FournisseurToast>
          </ThemeProvider>
        </FournisseurAuth>
      </body>
    </html>
  );
}
