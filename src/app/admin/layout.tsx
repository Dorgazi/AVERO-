import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Owner dashboard", template: "%s · AVÉRO admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col bg-ivory">{children}</div>;
}
