import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'BestLucky OS — Personal Interview Workbench (FDE · FDPM · AI PM · PM · Ops · PgM · Consulting)',
  description:
    'High-signal personal interview prep studio with JD customizer, 7-role question & answer studio, video library, Lark one-click sync, STAR+L story bank, and Gemini 4 rubric scoring.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--canvas)] text-[var(--ink-primary)]">
        <Suspense fallback={<div className="min-h-screen bg-[var(--canvas)]" />}>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </Suspense>
      </body>
    </html>
  );
}
