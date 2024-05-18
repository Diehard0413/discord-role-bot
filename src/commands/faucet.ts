/* 
* Users can use to claim free eth daily per account from the passed network and token
If you change this, make sure to run `pnpm bot:deletecommands && pnpm bot:addcommands`
! Rate limited
*/

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { networks } from "../config/config.json";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("faucet")
		.setDescription("Claim daily gETH from the faucet")
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
		.addStringOption(option => {
			option.setName("network").setDescription("Select the network").setRequired(true);

			networks.forEach(network => {
				option.addChoices({
					name: `${network.name.toUpperCase()}`,
					value: `${network.name.toLowerCase()}`,
				});
			});
			return option;
		})
		.addStringOption(option =>
			option
				.setName("address")
				.setDescription("Paste your wallet address")
				.setRequired(true)
		)
};
