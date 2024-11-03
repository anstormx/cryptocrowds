import { ethers, JsonRpcSigner } from "ethers";
import { useNotification } from "./toastNotification";

const POLYGON_AMOY_CHAIN_ID = "0x13882" as string;

const useProvider = () => {
	const notify = useNotification();

	const getProvider = async () => {
		const provider = new ethers.JsonRpcProvider(
			process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL
		);

		let address: string = "0x";
		let signer: JsonRpcSigner | null = null;

		if (typeof window !== "undefined" && window.ethereum) {
			try {
				const chainId = (await window.ethereum.request({
					method: "eth_chainId",
				})) as string;

				if (chainId !== POLYGON_AMOY_CHAIN_ID) {
					notify(
						"Error",
						"Please switch to the Polygon Amoy network",
						"destructive"
					);
					return {
						provider,
						address,
						signer,
					};
				}

				const accounts = (await window.ethereum.request({
					method: "eth_accounts",
				})) as string[];

				if (accounts.length > 0) {
					const browserProvider = new ethers.BrowserProvider(
						window.ethereum
					);
					signer = await browserProvider.getSigner();
					address = await signer.getAddress();

					return {
						provider: browserProvider,
						address,
						signer,
					};
				}
			} catch (error) {
				console.error("Error setting up provider:", error);
				notify("Error", "Error connecting to wallet", "destructive");
			}
		}

		return {
			provider,
			address,
			signer,
		};
	};

	// needs work
	// const switchToPolygonAmoy = async (): Promise<boolean> => {
	// 	if (!window.ethereum) return false;

	// 	try {
	// 		await window.ethereum.request({
	// 			method: "wallet_switchEthereumChain",
	// 			params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
	// 		});
	// 		return true;
	// 	} catch (error: any) {
	// 		// This error code indicates that the chain has not been added to MetaMask
	// 		if (error.code === 4902) {
	// 			try {
	// 				await window.ethereum.request({
	// 					method: "wallet_addEthereumChain",
	// 					params: [
	// 						{
	// 							chainId: POLYGON_AMOY_CHAIN_ID,
	// 							chainName: "Polygon Amoy Testnet",
	// 							nativeCurrency: {
	// 								name: "MATIC",
	// 								symbol: "MATIC",
	// 								decimals: 18,
	// 							},
	// 							rpcUrls: [
	// 								"https://polygon-amoy.g.alchemy.com/v2/",
	// 							],
	// 							blockExplorerUrls: [
	// 								"https://www.oklink.com/amoy",
	// 							],
	// 						},
	// 					],
	// 				});
	// 				return true;
	// 			} catch (addError) {
	// 				console.error(
	// 					"Error adding Polygon Amoy network:",
	// 					addError
	// 				);
	// 				return false;
	// 			}
	// 		}
	// 		console.error("Error switching to Polygon Amoy network:", error);
	// 		return false;
	// 	}
	// };

	return {
		getProvider,
		// switchToPolygonAmoy,
	};
};

export default useProvider;
