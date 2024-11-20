"use client";

import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import RequestRow from "@/components/requestRow";
import useProvider from "@/utils/getProvider";
import Campaign from "@/../artifacts/contracts/Campaign.sol/Campaign.json";
import { useAccount } from "wagmi";

interface Request {
	description: string;
	value: string;
	recipient: string;
	complete: boolean;
	approvalCount: string;
	rejectionCount: string;
    userVoted?: boolean; // New field to track user's voting status
}

interface RequestsData {
	requests: Request[];
	contributorsCount: string;
	requestCount: string;
}

interface RequestsPageProps {
	params: {
		address: string;
	};
}

export default function RequestsPage({ params }: RequestsPageProps) {
	const { address } = params;
	const { getProvider } = useProvider();
	const [requestsData, setRequestsData] = useState<RequestsData>({
		requests: [],
		contributorsCount: "0",
		requestCount: "0",
	});
	const [loading, setLoading] = useState(true);
	const [userContribution, setUserContribution] = useState("0");
	const [isOwner, setIsOwner] = useState(false);
	const { isConnected, address: userAddress } = useAccount();


    const fetchRequestsData = useCallback(async () => {
        try {
            const provider = (await getProvider()).provider;
            const campaign = new ethers.Contract(
                address,
                Campaign.abi,
                provider
            );

            const [requestCount, contributorsCount] = await Promise.all([
                campaign.getRequestsCount(),
                campaign.getContributorsCount(),
            ]);

            const requestPromises = Array(Number(requestCount))
                .fill(null)
                .map(async (_, index) => {
                    const request = await campaign.requests(index);
                    let userVoted = false;

                    if (isConnected && userAddress) {
                        userVoted = await campaign.hasVoted(index, userAddress);
                    }

                    return {
                        description: request.description,
                        value: ethers.formatEther(request.value),
                        recipient: request.recipient,
                        complete: request.complete,
                        approvalCount: request.approvalCount.toString(),
                        rejectionCount: request.rejectionCount.toString(),
                        userVoted
                    };
                });

            const requests = await Promise.all(requestPromises);

            setRequestsData({
                requests,
                contributorsCount: contributorsCount.toString(),
                requestCount: requestCount.toString(),
            });
        } catch (error) {
            console.error("Error fetching requests data:", error);
        } finally {
            setLoading(false);
        }
    }, [address, getProvider, isConnected, userAddress]);

    const fetchUserData = useCallback(async () => {
        if (!isConnected || !userAddress) return;
        
        const provider = (await getProvider()).provider;
        const campaign = new ethers.Contract(
            address,
            Campaign.abi,
            provider
        );

        const [contribution, owner] = await Promise.all([
            campaign.contributions(userAddress),
            campaign.owner(),
        ]);

        setUserContribution(ethers.formatEther(contribution));
        setIsOwner(owner.toLowerCase() === userAddress?.toLowerCase());
    }, [address, getProvider, isConnected, userAddress]);

    useEffect(() => {
        fetchRequestsData();
        if (isConnected) {
            fetchUserData();
        }
    }, [fetchRequestsData, fetchUserData, isConnected]);

	if (loading) {
		return (
			<div className="p-6">
				<div className="flex justify-center items-center h-64">
					<p className="text-gray-500">Loading requests...</p>
				</div>
			</div>
		);
	}

	const newRequest = () => {
		if (isOwner) {
			return (
				<div className="flex justify-between items-center mb-6">
					<h3 className="text-2xl font-bold">Requests</h3>
					<Link href={`/campaigns/${address}/requests/new`}>
						<Button>Add Request</Button>
					</Link>
				</div>
			);
		} else {
            return (
                <h3 className="text-2xl font-bold mb-6">Requests</h3>
            );
        }
	};

	return (
		<div className="p-6">
			{newRequest()}

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Amount (ETH)</TableHead>
						<TableHead>Recipient</TableHead>
						<TableHead>Approval Count</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{requestsData.requests.map((request, index) => (
						<RequestRow
							key={index}
							id={index + 1}
							request={request}
							address={address}
							contributorsCount={requestsData.contributorsCount}
							isOwner={isOwner}
							contribution={userContribution}
                            userVoted={request.userVoted || false} // Pass the voting status
                            onTransactionComplete={fetchRequestsData}
						/>
					))}
				</TableBody>
			</Table>

			<div className="mt-4">
				<p className="text-sm text-gray-600">
					Found {requestsData.requestCount} requests
				</p>
			</div>
		</div>
	);
}