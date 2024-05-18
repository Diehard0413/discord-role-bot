// Starting Point of the project : run `node .`
import { Collection, Client, GatewayIntentBits, Partials } from "discord.js";
import "dotenv/config";
import Keyv from "keyv";
import fs from "node:fs";
import path from "node:path";

import client from "./client"; // Get Client
import { InitializeDb } from "./database";

// KeyV Creation and Handling
const keyv = new Keyv();
keyv.on("error", (err?: Error) => {
	console.error("Keyv connection error:", err.message);
	throw new Error("Error KEYV: " + err.message);
});

// Run the Events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath);

for (const file of eventFiles) {
	const ePath = path.join(eventsPath, file);
	const event = require(ePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(keyv, client, ...args));
	}
}

// Gets all command files, and sets them
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath);

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	//Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}

// Database Connection
InitializeDb();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const GUILD_ID = process.env.GUILD_ID;
const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID;
const APPEAL_CHANNEL_ID = process.env.APPEAL_CHANNEL_ID;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) {
        console.error('Unable to find guild');
        process.exit(1);
    }
    
    const invites = await guild.invites.fetch();
    client.inviteCache = new Map(invites.map(invite => [invite.code, invite.uses]));
});

client.on('guildMemberAdd', async member => {
    const guild = member.guild;
    const newInvites = await guild.invites.fetch();
    const oldInvites = client.inviteCache;

    const invite = newInvites.find(i => oldInvites.get(i.code) < i.uses);
    client.inviteCache = new Map(newInvites.map(inv => [inv.code, inv.uses]));

    if (invite) {
        const inviter = await guild.members.fetch(invite.inviter.id);
        const inviteCount = invite.uses;

        const ogRole = guild.roles.cache.find(role => role.name === 'OG');
        const borkerRole = guild.roles.cache.find(role => role.name === 'Borker');
        
        if (inviteCount >= 5 && !inviter.roles.cache.has(ogRole.id)) {
            await inviter.roles.add(ogRole);
            const generalChannel = guild.channels.cache.get(GENERAL_CHANNEL_ID);
            if (generalChannel) {
                generalChannel.send(`${inviter} has earned the OG role for inviting 5 or more members!`);
            }
        } else if (inviteCount < 5) {
            await inviter.roles.add(borkerRole);
        }
    }
});

client.on('messageCreate', async message => {
    const member = message.member;

    if (!member) return;

    const bwoofaRole = message.guild.roles.cache.find(role => role.name === 'Bwoofa');
    const borkerRole = message.guild.roles.cache.find(role => role.name === 'Borker');
    const badBorkersRole = message.guild.roles.cache.find(role => role.name === 'bad borkers');

    if (member.roles.cache.has(bwoofaRole.id)) {
        member.lastMessageTime = Date.now();
    }

    setInterval(async () => {
        const now = Date.now();
        const timeDiff = now - (member.lastMessageTime || now);

        if (timeDiff > 3 * 24 * 60 * 60 * 1000 && member.roles.cache.has(bwoofaRole.id)) {
            await member.roles.remove(bwoofaRole);
            await member.roles.add(borkerRole);
            await member.roles.add(badBorkersRole);
            const appealChannel = message.guild.channels.cache.get(APPEAL_CHANNEL_ID);
            if (appealChannel) {
                appealChannel.send(`${member} has been inactive for over 3 days and has been demoted to the bad borkers role. You can appeal here.`);
            }
        }
    }, 24 * 60 * 60 * 1000);
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    const appealChannel = reaction.message.channel;
    if (appealChannel.id === APPEAL_CHANNEL_ID) {
        const ogBwoofaRole = reaction.message.guild.roles.cache.find(role => role.name === 'OG bwoofa');
        const bwoofaRole = reaction.message.guild.roles.cache.find(role => role.name === 'bwoofa');

        if (reaction.emoji.name === '👍' || reaction.emoji.name === '👎') {
            const votes = reaction.message.reactions.cache.get('👍').count - 1; // subtracting bot's vote
            const threshold = 3; // define the threshold for votes

            if (votes >= threshold) {
                const member = reaction.message.mentions.members.first();
                if (reaction.emoji.name === '👍' && (user.roles.cache.has(ogBwoofaRole.id) || user.roles.cache.has(bwoofaRole.id))) {
                    await member.roles.remove(reaction.message.guild.roles.cache.find(role => role.name === 'bad borkers'));
                    await member.roles.add(reaction.message.guild.roles.cache.find(role => role.name === 'bwoofa'));
                }
                await reaction.message.delete();
            }
        }
    }
});

// Login to Bot with token
try {
	const token: string = process.env.BOT_TOKEN as string;
	console.log(">>>>>>>> Discord login >>>>>>>>", token);
	client.login(token);
} catch (error) {
	console.error(`Error login to BOT at index : ${error}`);
}
