//* Used at delete-commands.js to delete all the commands in the BOT

import { REST } from "@discordjs/rest";
import { Routes } from "discord.js";
import "dotenv/config";

import { bot } from "../config/config.json";

module.exports = async (globally = false): Promise<void> => {
	const token: string = process.env.BOT_TOKEN as string;
	console.log(">>>>>>>> Delete commands >>>>>>>>", token);
	const rest = new REST({ version: "10" }).setToken(token);

	//! Removes the commands globally
	if (globally) {
		await rest.put(Routes.applicationCommands(bot.clientId), { body: [] });
		console.log("Successfully deleted all commands.");
		return;
	}

	//* Deletes only the commands in the passed guild
	await rest.put(Routes.applicationGuildCommands(bot.clientId, bot.guildId), {
		body: [],
	});
	console.log("Successfully deleted all guild commands.");
	return;
};
