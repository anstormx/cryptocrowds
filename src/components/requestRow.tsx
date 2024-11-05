"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { useNotification } from "@/utils/toastNotification";
import useProvider from "@/utils/getProvider";
import Campaign from "@/../artifacts/contracts/Campaign.sol/Campaign.json";

interface RequestRowProps {
	id: number;
	request: {
		description: string;
		value: string;
		recipient: string;
		complete: boolean;
		approvalCount: string;
		rejectionCount: string;
	};
	address: string;
	contributorsCount: string;
	isOwner: boolean;
	contribution: string;
}

export default function RequestRow({
	id,
	request,
	address,
	contributorsCount,
	isOwner,
	contribution,
}: RequestRowProps) {
	const [isApproving, setIsApproving] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);
	const [isFinalizing, setIsFinalizing] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);
	const notify = useNotification();
	const { getProvider } = useProvider();

	const isContributor = Number(contribution) > 0;
	const hasVoted = false; // You'll need to add this to your request struct and track it
	const isReadyToFinalize =
		Number(request.approvalCount) > Number(contributorsCount) / 2;

	const onApprove = async () => {
		try {
			setIsApproving(true);
			const signer = (await getProvider()).signer;
			const campaign = new ethers.Contract(address, Campaign.abi, signer);
			const tx = await campaign.approveRequest(id - 1);
			await tx.wait();
			notify("Success", "Request approved successfully!", "default");
		} catch (error) {
			console.error(error);
			let errorMessage = "An unknown error occurred";
			if (error instanceof Error) {
				if (error.message.includes("You have already voted")) {
					errorMessage = "You have already voted on this request";
				} else if (
					error.message.includes("Only contributors can approve")
				) {
					errorMessage = "Only contributors can approve a request";
				} else if (error.message.includes("user rejected")) {
					errorMessage = "Transaction was rejected by user";
				}
			}
			notify("Error", errorMessage, "destructive");
		} finally {
			setIsApproving(false);
		}
	};

	const onReject = async () => {
		try {
			setIsRejecting(true);
			const signer = (await getProvider()).signer;
			const campaign = new ethers.Contract(address, Campaign.abi, signer);
			const tx = await campaign.rejectRequest(id - 1);
			await tx.wait();
			notify("Success", "Request rejected successfully!", "default");
		} catch (error) {
			console.error(error);
			let errorMessage = "An unknown error occurred";
			if (error instanceof Error) {
				if (error.message.includes("You have already voted")) {
					errorMessage = "You have already voted on this request";
				} else if (
					error.message.includes("Only contributors can reject")
				) {
					errorMessage = "Only contributors can reject a request";
				} else if (error.message.includes("user rejected")) {
					errorMessage = "Transaction was rejected by user";
				}
			}
			notify("Error", errorMessage, "destructive");
		} finally {
			setIsRejecting(false);
		}
	};

	const onFinalize = async () => {
		try {
			setIsFinalizing(true);
			const signer = (await getProvider()).signer;
			const campaign = new ethers.Contract(address, Campaign.abi, signer);
			const tx = await campaign.finalizeRequest(id - 1);
			await tx.wait();
			notify("Success", "Request finalized successfully!", "default");
		} catch (error) {
			console.error(error);
			let errorMessage = "An unknown error occurred";
			if (error instanceof Error) {
				if (
					error.message.includes("Ownable: caller is not the owner")
				) {
					errorMessage = "Only the owner can finalize a request";
				} else if (
					error.message.includes("Request has already been completed")
				) {
					errorMessage = "Request has already been finalized";
				} else if (error.message.includes("user rejected")) {
					errorMessage = "Transaction was rejected by user";
				}
			}
			notify("Error", errorMessage, "destructive");
		} finally {
			setIsFinalizing(false);
		}
	};

	const onCancel = async () => {
		try {
			setIsCancelling(true);
			const signer = (await getProvider()).signer;
			const campaign = new ethers.Contract(address, Campaign.abi, signer);
			const tx = await campaign.cancelRequest(id - 1);
			await tx.wait();
			notify("Success", "Request cancelled successfully!", "default");
		} catch (error) {
			console.error(error);
			let errorMessage = "An unknown error occurred";
			if (error instanceof Error) {
				if (
					error.message.includes("Ownable: caller is not the owner")
				) {
					errorMessage = "Only the owner can cancel a request";
				} else if (error.message.includes("user rejected")) {
					errorMessage = "Transaction was rejected by user";
				}
			}
			notify("Error", errorMessage, "destructive");
		} finally {
			setIsCancelling(false);
		}
	};

	const renderActionButtons = () => {
		if (request.complete) {
			return <span className="text-green-600">Completed</span>;
		}

		if (isOwner) {
			return (
				<div className="space-x-2">
					<Button
						onClick={onCancel}
						disabled={isCancelling}
						variant="outline"
						size="sm"
					>
						{isCancelling ? "Cancelling..." : "Cancel"}
					</Button>
					{isReadyToFinalize && (
						<Button
							onClick={onFinalize}
							disabled={isFinalizing}
							variant="default"
							size="sm"
						>
							{isFinalizing ? "Finalizing..." : "Finalize"}
						</Button>
					)}
				</div>
			);
		}

		if (isContributor && !hasVoted) {
			return (
				<div className="space-x-2">
					<Button
						onClick={onApprove}
						disabled={isApproving}
						variant="outline"
						size="sm"
					>
						{isApproving ? "Approving..." : "Approve"}
					</Button>
					<Button
						onClick={onReject}
						disabled={isRejecting}
						variant="outline"
						size="sm"
					>
						{isRejecting ? "Rejecting..." : "Reject"}
					</Button>
				</div>
			);
		}

		if (isContributor && hasVoted) {
			return <span className="text-gray-600">Already voted</span>;
		}

		return (
			<div className="text-sm text-gray-500">
				Contribute to vote on this request
			</div>
		);
	};

	return (
		<TableRow>
			<TableCell>{id}</TableCell>
			<TableCell>{request.description}</TableCell>
			<TableCell>{request.value}</TableCell>
			<TableCell className="font-mono">
				{`${request.recipient.slice(0, 6)}...${request.recipient.slice(
					-4
				)}`}
			</TableCell>
			<TableCell>
				{request.approvalCount}/{contributorsCount}
			</TableCell>
			<TableCell>{renderActionButtons()}</TableCell>
		</TableRow>
	);
}
