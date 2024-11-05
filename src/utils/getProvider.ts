import { ethers, JsonRpcSigner, Provider } from "ethers";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useNotification } from "./toastNotification";
import { useCallback, useEffect } from "react";

const POLYGON_AMOY_CHAIN_ID = 80002;

const useProvider = () => {
	const notify = useNotification();
	const { isConnected } = useAccount();
	const chainId = useChainId();
	const { switchChain } = useSwitchChain();

	const getProvider = useCallback(async () => {
		const fallbackProvider = new ethers.JsonRpcProvider(
			process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL
		);

		let signer: JsonRpcSigner | null = null;
		let provider: Provider = fallbackProvider;

		try {
			if (isConnected && window.ethereum) {
				// Check if on the correct network
				if (chainId !== POLYGON_AMOY_CHAIN_ID) {
					try {
						await switchChain({ chainId: POLYGON_AMOY_CHAIN_ID });
					} catch (error) {
						console.error("Failed to switch network:", error);
						notify(
							"Error",
							"Please switch to the Polygon Amoy network",
							"destructive"
						);
						return {
							provider: fallbackProvider,
							address: "0x",
							signer: null,
						};
					}
				}

				// Set up browser provider
				const browserProvider = new ethers.BrowserProvider(
					window.ethereum
				);
				signer = await browserProvider.getSigner();
				provider = browserProvider;

				console.log("Browser provider");
			} else {
				console.log("Fallback provider");
			}
		} catch (error) {
			console.error("Error setting up provider:", error);
			notify("Error", "Error connecting to wallet", "destructive");

			console.log("Fallback provider");
			return { provider: fallbackProvider, signer: null };
		}

		return {
			provider,
			signer,
		};
	}, [chainId, isConnected]);

    useEffect(() => {
        getProvider();
    }, [getProvider]);

	return {
		getProvider,
	};
};

export default useProvider;
