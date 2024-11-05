"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";

const Header = () => {
	return (
		<header className="bg-background border-b px-[2%] py-[1%] w-full">
			<div className="flex items-center justify-between">
				<Link href="/" className="flex items-center space-x-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="h-6 w-6 text-primary"
					>
						<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
					</svg>
					<span className="text-xl font-bold text-primary">
						CryptoCrowds
					</span>
				</Link>
				<Button
					variant="outline"
					className="ml-[6%] relative h-8 w-full justify-start rounded-[0.5rem] text-sm font-normal text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
				>
					<span className="hidden lg:inline-flex">
						Search campaigns...
					</span>
					<span className="inline-flex lg:hidden">Search...</span>
					<kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
						<span className="text-xs">⌘</span>K
					</kbd>
				</Button>

				<div className="flex items-center space-x-4">
					<Link href="/campaigns/new" passHref>
						<Button
							variant="outline"
							size="sm"
							className="hidden sm:flex"
						>
							<Plus className="mr-2 h-4 w-4" />
							New Campaign
						</Button>
					</Link>
					<ConnectButton />
				</div>
			</div>
		</header>
	);
};

export default Header;
