import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TicsLab - IoT Collaboration Platform',
  description: 'Build and collaborate on IoT projects with TicsLab',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-gray-100">
        {children}
      </body>
    </html>
  );
}