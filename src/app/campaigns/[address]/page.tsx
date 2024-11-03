"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Campaign from "@/../artifacts/contracts/Campaign.sol/Campaign.json";
import ContributeForm from "@/components/contributeForm";
import useProvider from "@/utils/getProvider";

export default function CampaignDetails() {
    const params = useParams();
    const campaignAddress = params.address as string;
    const { getProvider } = useProvider();
    
    const [summary, setSummary] = useState({
        title: "",
        minContribution: "0",
        balance: "0",
        requestsCount: "0",
        contributorsCount: "0",
        manager: "",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchCampaignDetails = async () => {
            try {
                if (!campaignAddress) return;

                const provider = (await getProvider()).provider;
                const campaign = new ethers.Contract(
                    campaignAddress,
                    Campaign.abi,
                    provider
                );

                const summaryData = await campaign.getSummary();
                
                setSummary({
                    title: "title",
                    minContribution: ethers.formatEther(summaryData[0]),
                    balance: ethers.formatEther(summaryData[1]),
                    requestsCount: summaryData[2].toString(),
                    contributorsCount: summaryData[3].toString(),
                    manager: summaryData[4],
                });
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load campaign details"
                );
            } finally {
                setLoading(false);
            }
        };

        if (campaignAddress) {
            fetchCampaignDetails();
        }
    }, [campaignAddress]);

    const items = [
        {
            title: "Campaign Manager",
            value: summary.manager,
            description:
                "The manager created this campaign and can create requests to withdraw money",
        },
        {
            title: "Minimum Contribution",
            value: `${ethers.parseEther(summary.minContribution)} wei`,
            description:
                "You must contribute at least this much to become an voter",
        },
        {
            title: "Number of Requests",
            value: summary.requestsCount,
            description: "Number of withdrawal requests created by the manager",
        },
        {
            title: "Number of Contributors",
            value: summary.contributorsCount,
            description: "Number of people who have donated to this campaign",
        },
        {
            title: "Campaign Balance",
            value: `${summary.balance} ETH`,
            description: "The amount of ETH this campaign has left to spend",
        },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{summary.title}</h1>
                <p className="text-gray-600">Campaign Details</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map((item, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-semibold mb-2 break-all">
                                        {item.value}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {item.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contribute to Campaign</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ContributeForm
                                minContribution={summary.minContribution}
                                campaignAddress={campaignAddress}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="mt-8">
                <Link href={`/campaigns/${campaignAddress}/requests`}>
                    <Button>View Requests</Button>
                </Link>
            </div>
        </div>
    );
}