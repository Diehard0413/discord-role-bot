//* Handles all kinds of interactions
// Add all new commands build to here

import { Interaction, InteractionType } from "discord.js";
import Keyv from "keyv";

import { ExtendedClient } from "../classes/ExtendedClient";

const feedback_handle = require("../modals/feedback_handle");

module.exports = {
	name: "interactionCreate",
	async execute(keyv: Keyv, client: ExtendedClient, interaction: Interaction) {
		try {
			//* Chat Command Interactions
			if (interaction.isChatInputCommand()) {
				if (interaction.commandName === "balance") {
					require("../responses/balance_response")(interaction);
				} else if (interaction.commandName === "faucet") {
					require("../responses/faucet_response")(keyv, interaction);
				} else
					return;
			}
			//* Modal Command Interactions
			else if (interaction.type === InteractionType.ModalSubmit) {
				if (interaction.customId === "feedbackModal") {
					try {
						// Handle the data from the modal
						await feedback_handle(client, interaction);
						// Reply the user
						await interaction.reply({
							content: `💁🏼‍♂️ Your feedback was received successfully!`,
							ephemeral: true,
						});
						await keyv.set(`${interaction.user.id}:feedback`, Date.now());
					} catch (error) {
						console.error(`Error Submitting Feedback : ${error}`);
						await interaction.reply({
							content: "🙇‍♂️ Error, please try again later",
							ephemeral: true,
						});
					}
				}
			}
		} catch (error) {
			console.error(`Error Handling Interaction : ${error}`);
		}
	},
};
