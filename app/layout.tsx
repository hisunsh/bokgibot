import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${notoSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="bg-surface-base flex min-h-full flex-col text-[#d1d4dc]">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "!bg-surface-raised !border-surface-border !text-[#d1d4dc] !rounded-none",
              description: "!text-[#787b86]",
            },
          }}
        />
      </body>
    </html>
  );
}
