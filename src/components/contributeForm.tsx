"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import Campaign from "@/../artifacts/contracts/Campaign.sol/Campaign.json";
import { useNotification } from "@/utils/toastNotification";
import { useAccount, useBalance } from "wagmi";

interface ContributeFormProps {
	minContribution: string;
	campaignAddress: string;
    onContributionSuccess?: () => void;
}

export default function ContributeForm({
	minContribution,
	campaignAddress,
    onContributionSuccess,
}: ContributeFormProps) {
	const [contribution, setContribution] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [walletBalance, setWalletBalance] = useState<string>("0");
	const notify = useNotification();
	const { address, isConnected } = useAccount();

	// Fetch wallet balance
	const { data: balanceData } = useBalance({
		address: address,
	});

	// Update wallet balance when data changes
	useEffect(() => {
		if (balanceData) {
			// Convert balance to string with 4 decimal places
			const formattedBalance = parseFloat(
				ethers.formatEther(balanceData.value)
			).toFixed(3);
			setWalletBalance(formattedBalance);
		}
	}, [balanceData]);

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

			if (!isConnected) {
				notify("Error", "Please connect your wallet", "destructive");
				return;
			}

			if (!campaignAddress) {
				notify("Error", "Campaign address not found", "destructive");
				return;
			}

			if (!contribution) {
				notify(
					"Error",
					"Please enter a contribution amount",
					"destructive"
				);
				return;
			}

			if (isNaN(Number(contribution))) {
				notify("Error", "Please enter a valid number", "destructive");
				return;
			}

			const contributionInWei = ethers.parseEther(contribution);
			const minContributionInWei = ethers.parseEther(minContribution);

			if (contributionInWei < minContributionInWei) {
				throw new Error(
					`Minimum contribution is ${minContribution} MATIC`
				);
			}

			// Check wallet balance
			if (balanceData && contributionInWei > balanceData.value) {
				throw new Error(
					`Insufficient funds. Your balance is ${walletBalance} MATIC`
				);
			}

			const browserProvider = new ethers.BrowserProvider(window.ethereum);
			const signer = await browserProvider.getSigner();

			const campaign = new ethers.Contract(
				campaignAddress,
				Campaign.abi,
				signer
			);

			try {
				const tx = await campaign.contribute({
					value: contributionInWei,
				});

				await tx.wait();

                notify("Success", `Contribution successful\nTxnHash: ${tx.hash}`, "default");

			} catch (err) {
				throw new Error("Failed to contribute");
			}

            if (onContributionSuccess) {
                onContributionSuccess();
            }

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
						placeholder={`Min: ${minContribution}`}
						step={0.001}
						value={contribution}
						onChange={(e) => setContribution(e.target.value)}
					/>
					<div className="flex items-center bg-secondary px-3 rounded-md">
						<span className="text-sm">MATIC</span>
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
