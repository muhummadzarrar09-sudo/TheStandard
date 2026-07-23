import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Standard — Discipline OS",
  description: "A 30-day execution system. Private, paid, structured.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa" }}>
        {children}
      </body>
    </html>
  );
}
