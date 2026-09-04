import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "복기봇 (Bokgibot) - 바이낸스 선물 자동 매매일지 & 복기 툴",
  description:
    "API 연동 3초 만에 끝내는 암호화폐 선물 거래 복기 및 자동 매매일지",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-surface-base flex min-h-full flex-col text-slate-100">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "!bg-surface-overlay !border-surface-border !text-slate-100",
              description: "!text-slate-400",
            },
          }}
        />
      </body>
    </html>
  );
}
