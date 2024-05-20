import { TextChannel, Client, GatewayIntentBits, Partials, CommandInteraction } from "discord.js";
import "dotenv/config";
import { InitializeDb } from "./database";
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import fs from 'fs';
import path from 'path';

interface Command {
    data: {
        name: string;
        description: string;
        toJSON: () => object;
    };
    execute: (interaction: CommandInteraction) => Promise<void>;
}

class CustomClient extends Client {
    inviteCache: Map<string, number>;
    lastMessageTimes: Map<string, number>;
    commands: Map<string, Command>;

    constructor(options: any) {
        super(options);
        this.inviteCache = new Map();
        this.lastMessageTimes = new Map();
        this.commands = new Map();
    }
}

const client = new CustomClient({
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

// Database Connection
InitializeDb();

const GUILD_ID = process.env.GUILD_ID!;
const CLIENT_ID = process.env.CLIENT_ID!;
const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID!;
const APPEAL_CHANNEL_ID = process.env.APPEAL_CHANNEL_ID!;

if (!GUILD_ID || !CLIENT_ID || !GENERAL_CHANNEL_ID || !APPEAL_CHANNEL_ID) {
    throw new Error("One or more required environment variables are missing");
}

// Load Commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.ts'));
for (const file of commandFiles) {
    const command: Command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN!);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        const commands = Array.from(client.commands.values()).map(command => command.data.toJSON());

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        if (!guild) {
            console.error('Unable to find guild');
            process.exit(1);
        }

        if (!guild.invites) {
            console.error('Bot does not have permission to manage invites');
            process.exit(1);
        }

        const invites = await guild.invites.fetch();
        client.inviteCache = new Map(invites.map(invite => [invite.code, invite.uses!]));
    } catch (error) {
        console.error('Error fetching guild invites:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        const guild = member.guild;
        const newInvites = await guild.invites.fetch();
        const oldInvites = client.inviteCache;

        const invite = newInvites.find(i => oldInvites.get(i.code)! < i.uses!);
        client.inviteCache = new Map(newInvites.map(inv => [inv.code, inv.uses!]));

        if (invite) {
            const inviter = await guild.members.fetch(invite.inviter!.id);
            const inviteCount = invite.uses!;

            const ogRole = guild.roles.cache.find(role => role.name === 'OG')!;
            const borkerRole = guild.roles.cache.find(role => role.name === 'Borker')!;
            
            if (inviteCount >= 5 && !inviter.roles.cache.has(ogRole.id)) {
                await inviter.roles.add(ogRole);
                const generalChannel = guild.channels.cache.get(GENERAL_CHANNEL_ID);
                if (generalChannel && generalChannel instanceof TextChannel) {
                    generalChannel.send(`${inviter} has earned the OG role for inviting 5 or more members!`);
                }
            } else if (inviteCount < 5) {
                await inviter.roles.add(borkerRole);
            }
        }
    } catch (error) {
        console.error('Error handling guild member add:', error);
    }
});

client.on('messageCreate', async (message) => {
    const member = message.member;

    if (!member) return;

    const bwoofaRole = message.guild.roles.cache.find(role => role.name === 'Bwoofa')!;
    const borkerRole = message.guild.roles.cache.find(role => role.name === 'Borker')!;
    const badBorkersRole = message.guild.roles.cache.find(role => role.name === 'bad borkers')!;

    if (member.roles.cache.has(bwoofaRole.id)) {
        client.lastMessageTimes.set(member.id, Date.now());
    }

    setInterval(async () => {
        const now = Date.now();
        const lastMessageTime = client.lastMessageTimes.get(member.id) || now;
        const timeDiff = now - lastMessageTime;

        if (timeDiff > 3 * 24 * 60 * 60 * 1000 && member.roles.cache.has(bwoofaRole.id)) {
            await member.roles.remove(bwoofaRole);
            await member.roles.add(borkerRole);
            await member.roles.add(badBorkersRole);
            const appealChannel = message.guild.channels.cache.get(APPEAL_CHANNEL_ID);
            if (appealChannel && appealChannel instanceof TextChannel) {
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
        const member = await reaction.message.guild.members.fetch(user.id);
        const ogBwoofaRole = reaction.message.guild.roles.cache.find(role => role.name === 'OG bwoofa')!;
        const bwoofaRole = reaction.message.guild.roles.cache.find(role => role.name === 'bwoofa')!;

        if (reaction.emoji.name === '👍' || reaction.emoji.name === '👎') {
            const votes = reaction.message.reactions.cache.get('👍')!.count - 1; // subtracting bot's vote
            const threshold = 3; // define the threshold for votes

            if (votes >= threshold) {
                const appealMember = reaction.message.mentions.members.first()!;
                if (reaction.emoji.name === '👍' && (member.roles.cache.has(ogBwoofaRole.id) || member.roles.cache.has(bwoofaRole.id))) {
                    await appealMember.roles.remove(reaction.message.guild.roles.cache.find(role => role.name === 'bad borkers')!);
                    await appealMember.roles.add(reaction.message.guild.roles.cache.find(role => role.name === 'bwoofa')!);
                }
                await reaction.message.delete();
            }
        }
    }
});

// Login to Bot with token
try {
    const token = process.env.BOT_TOKEN!;
    client.login(token);
} catch (error) {
    console.error(`Error login to BOT at index: ${error}`);
}