import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { getConnectionState } from "@/lib/connection";

export const metadata: Metadata = {
  title: "ITSM Service Delivery — Analysis Studio",
  description:
    "Semi-manual ServiceNow XML analysis and knowledge article authoring for incidents, major incidents, change, problem, knowledge, and service catalog — with a prepared REST API connection lane.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const connection = await getConnectionState();

  return (
    <html lang="en">
      <body className="min-h-screen font-body text-ink antialiased">
        <div className="app-backdrop" aria-hidden="true" />
        <div className="relative z-10">
          <TopNav
            configured={connection.configured}
            instanceUrl={connection.instanceUrl}
          />
          {children}
        </div>
      </body>
    </html>
  );
}
