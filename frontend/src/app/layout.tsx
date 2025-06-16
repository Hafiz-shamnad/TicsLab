import type { Metadata } from 'next';
import './styles/globals.css';
import { AuthProvider } from "./context/AuthContext";

export const metadata: Metadata = {
  title: 'TicsLab - IoT Collaboration Platform',
  description: 'Build and collaborate on IoT projects with TicsLab',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}