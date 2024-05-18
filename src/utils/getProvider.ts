//* Returns the Provider or throws an Error if not found

import { ethers } from "ethers";

import { networks } from "../config/config.json";

// TODO : Use `DefaultProvider` so that the Bot uses Multiple RPC Nodes when possible

module.exports = async (networkName: string): Promise<ethers.providers.JsonRpcProvider> => {
	let networkRPC: string;

	// Loop Over Every Network until the correct network is found
	for (let i = 0; i < networks.length; i++) {
		if (networks[i].name.toLowerCase() == networkName.toLowerCase()) {
			networkRPC = networks[i].RPC_URL;
			break;
		}
	}

	if (!networkRPC) {
		throw new Error("Network RPC Not Setup!");
	}

	const provider = new ethers.providers.JsonRpcProvider(networkRPC);
	await provider.ready;
	return provider;
};
