"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CampaignFactory from "../../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json";
import useProvider from "@/utils/getProvider";

interface Campaign {
	address: string;
	isActive: boolean;
}

export default function Home() {
	const [campaigns, setCampaigns] = useState<Campaign[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { getProvider } = useProvider();

	async function fetchCampaigns() {
		try {
			const provider = (await getProvider()).provider;
			const factory = new ethers.Contract(
				process.env.NEXT_PUBLIC_FACTORY_ADDRESS!,
				CampaignFactory.abi,
				provider
			);

			const [addresses, statuses] = await factory.getDeployedCampaigns();

			const campaignList = addresses.map(
				(address: string, index: number) => ({
					address,
					isActive: statuses[index],
				})
			);

			setCampaigns(campaignList);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load campaigns"
			);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchCampaigns();
		console.log("fetchCampaigns");
	}, []);

	const renderCampaigns = () => {
		if (loading) {
			return (
				<div className="flex justify-center items-center h-48">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
				</div>
			);
		}

		if (error) {
			return (
				<div className="text-center p-4 text-red-600">
					<p>{error}</p>
				</div>
			);
		}

		if (campaigns.length === 0) {
			return (
				<div className="text-center p-4">
					<p className="text-gray-600">
						No campaigns found. Create the first one!
					</p>
				</div>
			);
		}

		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{campaigns.map((campaign) => (
					<Card key={campaign.address}>
						<div className="p-6">
							<h3 className="font-semibold mb-2 truncate">
								Campaign: {campaign.address}
							</h3>
							<p className="text-sm text-gray-600 mb-4">
								Status:{" "}
								{campaign.isActive ? "Active" : "Inactive"}
							</p>
							<Link
								href={`/campaigns/${campaign.address}`}
								className="inline-block"
							>
								<Button variant="outline">View Campaign</Button>
							</Link>
						</div>
					</Card>
				))}
			</div>
		);
	};

	return (
		<div className="min-h-screen">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">
						Welcome to CryptoCrowds!
					</h1>
					<p className="text-xl text-gray-600 mb-8">
						Bring a creative project to life through decentralized
						crowdfunding
					</p>
					<Link href="/campaigns/new">
						<Button size="lg" className="mb-8">
							Create Campaign
						</Button>
					</Link>
				</div>

				<div className="mb-8">
					<h2 className="text-2xl font-semibold text-gray-900 mb-4">
						Open Campaigns
					</h2>
					{renderCampaigns()}
				</div>
			</div>
		</div>
	);
}
