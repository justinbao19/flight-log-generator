import type { Metadata } from "next";
import { Inter, B612, B612_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

const b612 = B612({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-b612",
});

const b612Mono = B612_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-b612-mono",
});

export const metadata: Metadata = {
  title: "Flight Log Generator",
  description: "Convert flight records into professional PDF flight logs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${b612.variable} ${b612Mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
