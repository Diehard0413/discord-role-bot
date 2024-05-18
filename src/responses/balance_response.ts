//* Returns the balance of the Faucet Account in native Currency or the token passed

import { ChatInputCommandInteraction } from "discord.js";
import { ethers } from "ethers";

import { networks } from "../config/config.json";

const getBalance = require("../utils/getBalance");
const getProvider = require("../utils/getProvider");

module.exports = async (interaction: ChatInputCommandInteraction): Promise<void> => {
	// Initial Responce to client
	// console.log(">>>>>>>> balance response >>>>>>>>", interaction);
	// await interaction.reply({ content: "Calculating....", fetchReply: true });
	await interaction.deferReply({ ephemeral: true });

	// await interaction.deferReply();
	try {
		let balance: string; // Holds the final balance (string)

		// Get the Network,token and address from user input
		const usrAddress = interaction.options.getString("address");

		// Check whether address is valid
		if (!ethers.utils.isAddress(usrAddress)) {
			await interaction.editReply("Please enter a correct address");
			return;
		}
		// Get the Network and token from user input
		const networkName =
			interaction.options.getString("network") ?? networks[0].name.toLowerCase();
		let suffix: string;

		// Get the Provider based on the network
		const provider = (await getProvider(networkName)) as ethers.providers.JsonRpcProvider;

		//* Token not passed or native Currency
		balance = await getBalance(provider, usrAddress);

		// Get Suffix
		for (let i = 0; i < networks.length; i++) {
			if (networkName.toLowerCase() == networks[i].name.toLowerCase()) {
				suffix = networks[i].nativeCurrency.toUpperCase();
				break;
			}
		}
		// Rounding off the value
		const balancefinal = balance.toString().slice(0, balance.toString().indexOf(".") + 5);

		// Printing the value out
		await interaction.editReply(`${networkName.toUpperCase()}:  ${balancefinal} ${suffix}`);
	} catch (error) {
		console.error(`Error [RESPONCE - BALANCE] : ${error}`);
		await interaction.editReply("Please try again later");
	}
};
