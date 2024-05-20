// Log Printing and setting Discord Presence when the BOT wakes

import { ExtendedClient } from "../classes/ExtendedClient";

module.exports = {
	name: "ready",
	once: true,
	async execute(client: ExtendedClient) {
		try {
			// Setting Status of Bot
			client.user.setStatus("online");

			console.log(`Ready! Logged in as ${client.user.tag}`);
		} catch (error) {
			console.error(`Error Starting BOT in ready : ${error}`);
		}
	},
};
