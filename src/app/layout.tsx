import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/header";
import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
	title: "CryptoCrowds - Decentralized Crowdfunding",
	description: "Decentralized Crowdfunding",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<Providers>
					<Header />
					{children}
                    <Toaster />
				</Providers>
			</body>
		</html>
	);
}
