import type { Metadata, Viewport } from "next";
import { Anton, Montserrat } from "next/font/google";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-mont",
});

export const metadata: Metadata = {
  title: "The Jensen Times",
  description: "All the news that's fit to overclock. Live NVIDIA stock price, tabloid-style.",
};

export const viewport: Viewport = {
  themeColor: "#d7262b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
