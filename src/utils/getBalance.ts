//* Returns a string of the balance.
// If passed tokenName and networkName, then the interaction is considered as an ERC20, else it's considered native.

import { ethers } from "ethers";

module.exports = async (
	provider: ethers.providers.JsonRpcProvider,
	walletAddress: string,
): Promise<string> => {
	//* Native Balance
	return ethers.utils.formatEther(await provider.getBalance(walletAddress));
};
