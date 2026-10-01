import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {title:'RezAI — AI Property Operations Copilot',description:'AI-powered property operations copilot for short-term rental teams.'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
