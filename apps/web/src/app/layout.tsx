import type { ReactNode } from "react";

export const metadata = {
  title: "CreatorLend",
  description: "Faire Vergütung für Kreative – ein Werk = eine Woche = eine faire Bezahlung.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
