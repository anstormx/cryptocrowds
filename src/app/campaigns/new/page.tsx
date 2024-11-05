"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { ethers, TransactionReceipt } from "ethers";
import CampaignFactory from "../../../../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json";
import { useNotification } from "@/utils/toastNotification";
import useProvider from "@/utils/getProvider";

interface CampaignNewState {
	title: string;
	minContribution: string;
	loading: boolean;
}

const CampaignNew = () => {
	const router = useRouter();
	const notify = useNotification();
	const [state, setState] = useState<CampaignNewState>({
		title: "",
		minContribution: "",
		loading: false,
	});
	const { isConnected } = useAccount();
    const { getProvider } = useProvider();

	// const isMounted = useIsMounted();

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();

		// Check if the user is connected
		if (!isConnected) {
			notify("Error", "Please connect your wallet", "destructive");
			return;
		}

		// Check if the title is empty
		if (!state.title) {
			notify("Error", "Please enter a title", "destructive");
			return;
		}

		// Check if the minimum contribution is empty
		if (!state.minContribution) {
			notify(
				"Error",
				"Please enter a minimum contribution",
				"destructive"
			);
			return;
		}

		// Check if the minimum contribution is a number
		if (isNaN(Number(state.minContribution))) {
			notify("Error", "Please enter a valid number", "destructive");
			return;
		}

		setState((prev) => ({ ...prev, loading: true }));

		try {
            const signer = (await getProvider()).signer;
            const factoryContract = new ethers.Contract(
                process.env.NEXT_PUBLIC_FACTORY_ADDRESS as string,
                CampaignFactory.abi,
                signer
            );
			const txn = await factoryContract.createCampaign(
                state.title,
				state.minContribution
			);
			const receipt = await txn.wait() as TransactionReceipt;

			console.log("Receipt: ", receipt);

			// Extract the campaign address from the event logs
			const event = receipt.logs
				.map((log) => {
					try {
						return factoryContract.interface.parseLog({
							topics: log.topics,
							data: log.data,
						});
					} catch {
						return null;
					}
				})
				.find((event) => event && event.name === "CampaignCreated");

			const campaignAddress = event ? event.args.campaignAddress : null;

			notify(
				"Success",
				`Campaign created successfully!\nContract Address: ${campaignAddress}`,
				"default"
			);
            
			router.push("/");
		} catch (err) {
            console.error("Error creating campaign:", err);
            let errorMessage = "An unknown error occurred";
            if(err instanceof Error) {
                if(err.message.includes("user rejected")) {
					errorMessage = "Transaction was rejected by user";
				}
            }

			notify("Error", errorMessage, "destructive");
		}

		setState((prev) => ({ ...prev, loading: false }));
	};

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
