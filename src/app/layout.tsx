import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatHat — Real-time chat",
  description: "A clean, lightning-fast real-time chat app.",
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('chathat-theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e){
    document.documentElement.setAttribute('data-theme','light');
  }
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
