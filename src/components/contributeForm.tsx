"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import Campaign from "@/../artifacts/contracts/Campaign.sol/Campaign.json";
import useProvider from "@/utils/getProvider";
import { useNotification } from "@/utils/toastNotification";

interface ContributeFormProps {
	minContribution: string;
	campaignAddress: string;
}

export default function ContributeForm({
	minContribution,
	campaignAddress,
}: ContributeFormProps) {
	const router = useRouter();
	const [contribution, setContribution] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const { getProvider } = useProvider();
	const notify = useNotification();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			if (!window.ethereum) {
				notify(
					"Error",
					"Please install MetaMask to use this application",
					"destructive"
				);
				return;
			}

			if (!campaignAddress) {
				notify("Error", "Campaign address not found", "destructive");
				return;
			}

			if (parseFloat(contribution) < ethers.parseUnits(minContribution)) {
				throw new Error(
					`Minimum contribution is ${ethers.parseEther(
						minContribution
					)} wei`
				);
			}

			const signer = (await getProvider()).signer;

			const campaign = new ethers.Contract(
				campaignAddress,
				Campaign.abi,
				signer
			);

			try {
				const tx = await campaign.contribute({
					value: contribution,
				});

				await tx.wait();
			} catch (err) {
				throw new Error("Failed to contribute");
			}

			notify("Success", "Contribution successful", "default");

			// Refresh the page to show updated stats
			router.refresh();
			setContribution("");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to contribute"
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="contribution">Contribution Amount</Label>
				<div className="flex space-x-2">
					<Input
						id="contribution"
						type="number"
						placeholder={`Min: ${ethers.parseEther(
							minContribution
						)}`}
						value={contribution}
						onChange={(e) => setContribution(e.target.value)}
					/>
					<div className="flex items-center bg-secondary px-3 rounded-md">
						<span className="text-sm">wei</span>
					</div>
				</div>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? (
					<div className="flex items-center justify-center">
						<div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2" />
						Processing...
					</div>
				) : (
					"Contribute!"
				)}
			</Button>
		</form>
	);
}
