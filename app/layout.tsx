import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {title:'RezAI — AI Property Operations Copilot',description:'AI-powered property operations copilot for short-term rental teams.'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/><link href="https://fonts.googleapis.com/css2?family=Gloock&family=Figtree:wght@400..800&display=swap" rel="stylesheet"/></head><body>{children}</body></html>; }
