//* Returns a transaction object which can be used to transfer to the passed address
// Pass the token Name and Network Name if the transaction is meant to be using a ERC20 token

import "dotenv/config";
import { ethers } from "ethers";

import { stats } from "../config/config.json";

module.exports = async (
	provider: ethers.providers.JsonRpcProvider,
	usrAddress: string,
	networkName: string,
): Promise<ethers.providers.TransactionResponse> => {
	// Create a wallet instance
	const key: string = process.env.WALLET_PRIVATE_KEY as string;
	console.log(">>>>>>>> transfer key >>>>>>>>", key);
	let wallet: ethers.Wallet = new ethers.Wallet(key, provider);

	if (!wallet) throw new Error("Wallet Construction Failed!");

	//* Native Transfer
	console.log(">>>>>>>> transfer >>>>>>>>", wallet.address, usrAddress, ethers.utils.parseEther(stats.dailyEth.toString()));
	const nonce = await provider.getTransactionCount(stats.walletAddress); // Get the latest nonce
	let txObj: ethers.providers.TransactionRequest = {
		to: usrAddress,
		nonce,
		value: ethers.utils.parseEther(stats.dailyEth.toString()),
		type: 2,
		// maxFeePerGas: stats.maxFee,
		// maxPriorityFeePerGas: stats.maxFee,
		// gasLimit: "21000",
	}; // Holds the Transation Object

	// Transaction (Call await on the receiving end)
	return await wallet.sendTransaction(txObj);
};
