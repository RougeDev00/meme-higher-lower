import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "PUMP or DUMP? - PLAY NOW!",
  description: "Can you guess which Solana meme coin has the higher market cap? Test your crypto knowledge and compete for the top of the leaderboard!",
  keywords: "solana, meme coin, crypto game, higher lower, market cap",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}
