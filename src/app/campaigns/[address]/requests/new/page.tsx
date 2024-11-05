"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Campaign from "@/../artifacts/contracts/Campaign.sol/Campaign.json";
import useProvider from "@/utils/getProvider";
import { useNotification } from "@/utils/toastNotification";
import { useAccount } from "wagmi";

interface RequestNewPageProps {
	params: {
		address: string;
	};
}

export default function RequestNewPage({ params }: RequestNewPageProps) {
	const { address } = params;
	const router = useRouter();
	const notify = useNotification();
	const { getProvider } = useProvider();
	const [formState, setFormState] = useState({
		description: "",
		amount: "",
		recipient: "",
	});
	const [isLoading, setIsLoading] = useState(false);
    const {isConnected} = useAccount();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
            if (!isConnected) {
                notify("Error", "Please connect your wallet", "destructive");
                return;
            }

			const { signer } = await getProvider();
			const campaign = new ethers.Contract(address, Campaign.abi, signer);

			try {
				ethers.getAddress(formState.recipient);
			} catch (error) {
				throw new Error("Invalid recipient address");
			}

			const tx = (await campaign.createRequest(
				formState.description,
				formState.amount,
				formState.recipient
			)) as ethers.TransactionResponse;

			await tx.wait();

			notify(
				"Success",
				`Request created successfully\nTxnHash: ${tx.hash}`,
				"default"
			);

			router.push(`/campaigns/${address}/requests`);
		} catch (error) {
			console.error(error);
			let errorMessage = "An unknown error occurred";

			if (error instanceof Error) {
				if (error.message.includes("Insufficient funds")) {
					errorMessage =
						"Insufficient funds in Campaign contract to create request";
				} else if (error.message.includes("user rejected")) {
					errorMessage = "Transaction was rejected by user";
				} else if (
					error.message.includes("Ownable: caller is not the owner")
				) {
					errorMessage = "Only the owner can create a request";
				} else {
					errorMessage = error.message;
				}
			}

			notify("Error", errorMessage, "destructive");
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormState((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	return (
		<div className="container mx-auto p-6">
			<Card>
				<CardHeader>
					<CardTitle>Create New Request</CardTitle>
					<CardDescription>
						Create a new spending request for your campaign
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								name="description"
								placeholder="Enter request description"
								value={formState.description}
								onChange={handleInputChange}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="amount">Amount (wei)</Label>
							<Input
								id="amount"
								name="amount"
								type="number"
								step="any"
								placeholder="Enter amount in ETH"
								value={formState.amount}
								onChange={handleInputChange}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="recipient">Recipient Address</Label>
							<Input
								id="recipient"
								name="recipient"
								placeholder="Enter recipient's Ethereum address"
								value={formState.recipient}
								onChange={handleInputChange}
								required
							/>
						</div>

						<div className="flex justify-end">
							<Button type="submit" disabled={isLoading}>
								{isLoading ? "Creating..." : "Create Request"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
