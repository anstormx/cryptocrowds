import { ethers, BrowserProvider, JsonRpcSigner, AlchemyProvider } from "ethers";
import { toast } from "react-toastify";

const getProvider = async () => {
  const provider = new ethers.AlchemyProvider(
    "matic-amoy",
    process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL
  );
  
  let address = "0x";
  let signer: JsonRpcSigner | null = null;

  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (chainId !== "0x13882") {
        toast.warn(
          "Please switch to Polygon Amoy network in your wallet"
        );

        // add network switch functionality here
      }

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length > 0) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        signer = await browserProvider.getSigner();
        address = await signer.getAddress();
        
        return {
          provider: browserProvider,
          address,
          signer,
        };
      } else {
        toast.info("Please connect with MetaMask to interact with the NFT");
      }
    } catch (error) {
      console.error("Error setting up provider:", error);
      toast.error("Error connecting to wallet");
    }
  }

  return {
    provider,
    address,
    signer,
  };
};

// Optional: Add network switching functionality
export const switchToPolygonAmoy = async (): Promise<boolean> => {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
    });
    return true;
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: POLYGON_AMOY_CHAIN_ID,
              chainName: "Polygon Amoy Testnet",
              nativeCurrency: {
                name: "MATIC",
                symbol: "MATIC",
                decimals: 18,
              },
              rpcUrls: ["https://polygon-amoy.g.alchemy.com/v2/"],
              blockExplorerUrls: ["https://www.oklink.com/amoy"],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding Polygon Amoy network:", addError);
        return false;
      }
    }
    console.error("Error switching to Polygon Amoy network:", error);
    return false;
  }
};

export default getProvider;