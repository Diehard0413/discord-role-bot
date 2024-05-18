//* Transfers the set dailyEth value to the requested user.

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { ethers } from "ethers";
import Keyv from "keyv";

import { stats } from "../config/config.json";

const getBalance = require("../utils/getBalance");
const getProvider = require("../utils/getProvider");
const getTxName = require("../utils/getTxName");
const { getTimer, setTimer } = require("../utils/handleRateLimiting");
const transfer = require("../utils/transfer");

module.exports = async (keyv: Keyv, interaction: ChatInputCommandInteraction): Promise<void> => {
	// Initial Responce to client
	await interaction.reply({ content: "Preparing....", fetchReply: true });
	// await interaction.deferReply({ ephemeral: true });

	try {
		// Get the Network,token and address from user input
		const usrAddress = interaction.options.getString("address");
		const networkName = interaction.options.getString("network");

		// Check whether address is valid
		if (!ethers.utils.isAddress(usrAddress)) {
			await interaction.editReply("Please enter a correct address");
			return;
		}

		// Get the Provider based on the network
		const provider = (await getProvider(networkName)) as ethers.providers.JsonRpcProvider;

		//* Native Transfer
		
		// If the balance is too low (curBalance is string)
		const curBalance = (await getBalance(provider, stats.walletAddress)) as string;
		if (parseFloat(curBalance) < stats.dailyEth) {
			await interaction.editReply(
				`Insufficient funds, please donate to : ${stats.walletAddress}`
			);
			return;
		}

		// Rate Limiting for nonce
		const nonceLimit = (await getTimer(interaction, networkName, true, keyv)) as
			| number
			| undefined;
		if (nonceLimit) {
			const timeLeft = Math.floor(
				(stats.globalCoolDown - (Date.now() - nonceLimit)) / 1000
			);
			await interaction.editReply(
				`Please wait for ${timeLeft} seconds before requesting`
			);
			return;
		}

		// Rate Limiting for non Admins
		const limit = (await getTimer(interaction, networkName, false, keyv)) as
			| number
			| undefined;
		if (limit) {
			const timeLeft = Math.floor((stats.coolDownTime - (Date.now() - limit)) / 1000);
			await interaction.editReply(`Cool people waits for ${timeLeft} seconds`);
			return;
		} else {
			await setTimer(interaction, networkName, true, keyv);
		}

		// Transaction
		const tx = (await transfer(
			provider,
			usrAddress,
			networkName
		)) as ethers.providers.TransactionResponse;
		const string = await getTxName(networkName);
		const embed = new EmbedBuilder()
			.setColor("#3BA55C")
			.setDescription(`[View Transaction](${string}${tx.hash})`);
		await interaction.editReply({
			content: `In transferring, please wait...`,
			embeds: [embed],
		});
		await tx.wait();
		await setTimer(interaction, networkName, false, keyv);
		await interaction.editReply("Successfully transferred!");
	} catch (error) {
		console.error(`Error Transferring : ${error}`);
		await interaction.editReply("Please try again later");
	}
};
