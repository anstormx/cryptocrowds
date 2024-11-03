"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "wagmi";
import { useIsMounted } from "@/hooks/useIsMounted";
import { ethers } from "ethers";
import CampaignFactory from "../../../../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json";

interface CampaignNewState {
	title: string;
	minContribution: string;
	loading: boolean;
}

const CampaignNew = () => {
	const router = useRouter();
	const { toast } = useToast();
	const [state, setState] = useState<CampaignNewState>({
		title: "",
		minContribution: "",
		loading: false,
	});
	const [factoryContract, setFactoryContract] =
		useState<ethers.Contract | null>(null);
	const { address, isConnected } = useAccount();
	const isMounted = useIsMounted();

	useEffect(() => {
		const initContract = async () => {
			if (typeof window !== "undefined" && window.ethereum) {
				try {
					const accounts = await window.ethereum.request({
						method: "eth_accounts",
					});

					if (accounts && accounts.length > 0) {
						const provider = new ethers.BrowserProvider(
							window.ethereum
						);
						const signer = await provider.getSigner();
						const contract = new ethers.Contract(
							process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "",
							CampaignFactory.abi,
							signer
						);
						setFactoryContract(contract);
					}
				} catch (error) {
					console.error("Failed to initialize contract:", error);
				}
			}
		};

		if (isMounted) {
			initContract();
		}
	}, [isMounted, address]);

	const notification = (
		title: string,
		description: string,
		variant: "default" | "destructive"
	) => {
		toast({
			title,
			description,
			variant,
		});
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();

		// Check if the user is connected
		if (!isConnected) {
			notification("Error", "Please connect your wallet", "destructive");
			return;
		}

		// Check if the contract is initialized
		if (!factoryContract) {
			notification("Error", "Contract not initialized", "destructive");
			return;
		}

		// Check if the title is empty
		if (!state.title) {
			notification("Error", "Please enter a title", "destructive");
			return;
		}

		// Check if the minimum contribution is empty
		if (!state.minContribution) {
			notification(
				"Error",
				"Please enter a minimum contribution",
				"destructive"
			);
			return;
		}

		// Check if the minimum contribution is a number
		if (isNaN(Number(state.minContribution))) {
			notification("Error", "Please enter a valid number", "destructive");
			return;
		}

		setState((prev) => ({ ...prev, loading: true }));

		try {
			// Create a new campaign
			const txn = await factoryContract.createCampaign(
				state.minContribution
			);
			await txn.wait();

			console.log("Transaction: ", txn);
			notification(
				"Success",
				"Campaign created successfully!",
				"default"
			);
            
			router.push("/");
		} catch (err) {
			notification("Error", "An unknown error occurred", "destructive");
		}

		setState((prev) => ({ ...prev, loading: false }));
	};

	if (!isMounted) {
		return null;
	}

	return (
		<div className="mx-auto px-4 py-6 max-w-2xl">
			<Card>
				<CardHeader>
					<CardTitle>Create New Campaign</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="title">Campaign Title</Label>
							<div className="flex space-x-2">
								<Input
									id="title"
									placeholder="Enter the Title"
									value={state.title}
									onChange={(e) =>
										setState((prev) => ({
											...prev,
											title: e.target.value,
										}))
									}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="minContribution">
								Minimum Contribution
							</Label>
							<div className="flex space-x-2">
								<Input
									id="minContribution"
									placeholder="Enter an Amount"
									value={state.minContribution}
									onChange={(e) =>
										setState((prev) => ({
											...prev,
											minContribution: e.target.value,
										}))
									}
								/>
								<div className="flex items-center bg-secondary px-3 rounded-md">
									<span className="text-sm">wei</span>
								</div>
							</div>
						</div>

						<div className="flex justify-end">
							<Button type="submit" disabled={state.loading}>
								{state.loading && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Submit
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
};

export default CampaignNew;
