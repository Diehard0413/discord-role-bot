import { TextChannel, Client, GatewayIntentBits, Partials, CommandInteraction, PermissionsBitField } from "discord.js";
import "dotenv/config";
import { InitializeDb, db } from "./database";
import InviteTracker from "./classes/InviteTracker";
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
    highestRoleAchieved: Map<string, string>; // Track the highest role achieved by each member

    constructor(options: any) {
        super(options);
        this.inviteCache = new Map();
        this.lastMessageTimes = new Map();
        this.commands = new Map();
        this.highestRoleAchieved = new Map();
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

const tracker = InviteTracker.init(client, {
    fetchGuilds: true,
    fetchVanity: true,
    fetchAuditLogs: true
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

        const botMember = await guild.members.fetch(client.user!.id);
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
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

tracker.on('guildMemberAdd', async (member, type, invite) => {
    const guild = member.guild;
    const generalChannel = guild.channels.cache.get(GENERAL_CHANNEL_ID);

    if (generalChannel && generalChannel instanceof TextChannel) {
        if (type === 'normal' && invite) {
            generalChannel.send(`Welcome ${member}! You were invited by ${invite.inviter!.username}!`);

            const inviter = await guild.members.fetch(invite.inviter!.id);

            // Fetch the current invite count from the database
            const result = await db.query(`
                SELECT invite_count FROM invite_tracking WHERE inviter_id = $1
            `, [inviter.id]);

            let inviteCount = result.rows[0] ? result.rows[0].invite_count : 0;

            // Update the invite count
            inviteCount++;
            generalChannel.send(`${inviter} has invited ${inviteCount} member(s)!`);

            const ogRole = guild.roles.cache.find(role => role.name === 'OG Bwoofa')!;
            const fatDawgsRole = guild.roles.cache.find(role => role.name === 'Fat Dawgs')!;

            const botMember = await guild.members.fetch(client.user!.id);

            if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                console.error('Bot does not have permission to manage roles');
                return;
            }

            if (botMember.roles.highest.position <= ogRole.position) {
                console.error('Bot role is not high enough to manage the roles');
                return;
            }

            const ogRoleMembersCount = guild.roles.cache.get(ogRole.id)?.members.size || 0;
            if (inviteCount >= 5 && ogRoleMembersCount < 200 && !inviter.roles.cache.has(ogRole.id) && inviter.roles.cache.has(fatDawgsRole.id)) {
                await inviter.roles.add(ogRole);
                generalChannel.send(`${inviter} has earned the OG role for inviting 5 or more members!`);
            }

            // Add or update invite tracking in the database
            await db.query(`
                INSERT INTO invite_tracking (inviter_id, invite_count)
                VALUES ($1, $2)
                ON CONFLICT (inviter_id) 
                DO UPDATE SET invite_count = EXCLUDED.invite_count
            `, [inviter.id, inviteCount]);

            await db.query(`
                INSERT INTO member_invites (member_id, inviter_id)
                VALUES ($1, $2)
                ON CONFLICT (member_id) 
                DO NOTHING
            `, [member.id, inviter.id]);
        } else if (type === 'vanity') {
            generalChannel.send(`Welcome ${member}! You joined using a custom invite!`);
        } else if (type === 'permissions') {
            generalChannel.send(`Welcome ${member}! I can't figure out how you joined because I don't have the "Manage Server" permission!`);
        } else if (type === 'unknown') {
            generalChannel.send(`Welcome ${member}! I can't figure out how you joined the server...`);
        }
    }
});

client.on('guildMemberRemove', async (member) => {
    const inviterId = (await db.query(`
        DELETE FROM member_invites
        WHERE member_id = $1
        RETURNING inviter_id
    `, [member.id])).rows[0]?.inviter_id;

    if (inviterId) {
        const inviteCount = (await db.query(`
            UPDATE invite_tracking
            SET invite_count = invite_count - 1
            WHERE inviter_id = $1
            RETURNING invite_count
        `, [inviterId])).rows[0].invite_count;

        const guild = member.guild;
        const inviter = await guild.members.fetch(inviterId);

        const generalChannel = guild.channels.cache.get(GENERAL_CHANNEL_ID);

        if (generalChannel && generalChannel instanceof TextChannel) {
            generalChannel.send(`${inviter} now has ${inviteCount} invites after ${member.user.username} left.`);

            // Handle role removal if needed
            const ogRole = guild.roles.cache.find(role => role.name === 'OG Bwoofa')!;
            const fatDawgsRole = guild.roles.cache.find(role => role.name === 'Fat Dawgs')!;

            if (inviteCount < 5 && inviter.roles.cache.has(ogRole.id) && inviter.roles.cache.has(fatDawgsRole.id)) {
                await inviter.roles.remove(ogRole);
                generalChannel.send(`${inviter} can earn the OG role after inviting 5 or more members!`);
            }
        }
    }
});

// Inactivity Check and Role Management
setInterval(async () => {
    const now = Date.now();

    console.log('client.lastMessageTimes', client.lastMessageTimes);

    client.lastMessageTimes.forEach(async (lastMessageTime, memberId) => {
        console.log('lastMessageTime', lastMessageTime);
        console.log('memberId', memberId);
        const timeDiff = now - lastMessageTime;
        console.log('timeDiff', timeDiff);
        const member = await client.guilds.cache.get(GUILD_ID)?.members.fetch(memberId);
        if (!member) return;

        const dawgTeamRole = member.roles.cache.find(role => role.name === 'Dawg Team');
        const bwoofaRole = member.roles.cache.find(role => role.name === 'Bwoofa');
        const badBorkersRole = member.guild.roles.cache.find(role => role.name === 'Bad Borker');
        // console.log('bwoofaRole', bwoofaRole);
        if (timeDiff > /*3 * 24 * 60 */ 60 * 1000 && bwoofaRole && member.roles.cache.has(dawgTeamRole.id)) {
            await member.roles.remove(bwoofaRole);
            await member.roles.add(badBorkersRole);
            const appealChannel = member.guild.channels.cache.get(APPEAL_CHANNEL_ID);
            if (appealChannel && appealChannel instanceof TextChannel) {
                const appealMessage = await appealChannel.send(
                    `<@${member.id}> Oops, you've stopped bwoofing with us 😦
                    Now you are just a @Bad Borker.
                    
                    To bwoof with us again, ask @OG Bwoofa and @Bwoofa to invite you back into the pack!
                    They might need a little convincin' though.
                    
                    Get 20+ 👍 from @OG Bwoofa and @Bwoofa you are back babyyyy.
                    Get 10+ 👍, you get @FCFS Bwoofa role.
                    If you get less than <10 👍, better try again later and be more convincing next time.`);
                // await appealMessage.react('👍');
                // await appealMessage.react('👎');
            }
        }
    });
}, /*24 * 60 */ 60 * 1000); // Check every 24 hours

client.on('messageCreate', async (message) => {
    const member = message.member;
    if (!member) return;

    const dawgTeamRole = message.guild.roles.cache.find(role => role.name === 'Dawg Team')!;
    console.log('messageCreate', member.roles.cache.has(dawgTeamRole.id));
    if (member.roles.cache.has(dawgTeamRole.id)) {
        client.lastMessageTimes.set(member.id, Date.now());
    }
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

    handleReaction(reaction);
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    handleReaction(reaction);
});

const handleReaction = async (reaction: any) => {
    const appealChannel = reaction.message.channel;
    if (appealChannel.id === APPEAL_CHANNEL_ID) {
        const dawgTeamRole = reaction.message.guild.roles.cache.find(role => role.name === 'Dawg Team');
        const bwoofaRole = reaction.message.guild.roles.cache.find(role => role.name === 'Bwoofa')!;
        const fcfsBwoofaRole = reaction.message.guild.roles.cache.find(role => role.name === 'FCFS Bwoofa')!;
        const badBorkersRole = reaction.message.guild.roles.cache.find(role => role.name === 'Bad Borker')!;

        const thumbsUpVariants = ['👍', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿'];
        console.log('reaction.emoji.name', reaction.emoji.name);
        console.log('thumbsUpVariants', thumbsUpVariants.includes(reaction.emoji.name));
        if (!thumbsUpVariants.includes(reaction.emoji.name)) {
            // Ignore reactions that are not thumbs up
            return;
        }

        const thumbsUpReactions = reaction.message.reactions.cache.filter(r => thumbsUpVariants.includes(r.emoji.name));
        const totalVotes = thumbsUpReactions.reduce((acc, r) => acc + (r.count || 0), 0); // subtracting bot's vote

        const appealMember = await reaction.message.guild.members.fetch(reaction.message.author.id);
        if (!appealMember) {
            console.error('Appeal member not found in message author.');
            return;
        }

        console.log('appealMember.id', appealMember.id);
        console.log('appealMember: ', appealMember.roles.cache.has(dawgTeamRole.id));
        console.log('totalVotes', totalVotes);
        // const highestRole = client.highestRoleAchieved.get(appealMember.id) || 'Bad Borker';
        if (totalVotes >= 2 && appealMember.id != '1242124604785557697' && appealMember.roles.cache.has(dawgTeamRole.id)) {
            if (appealMember.roles.cache.has(fcfsBwoofaRole.id)) {
                await appealMember.roles.remove(fcfsBwoofaRole);
            }
            if (!appealMember.roles.cache.has(bwoofaRole.id)) {
                await appealMember.roles.add(bwoofaRole);
                // client.highestRoleAchieved.set(appealMember.id, 'Bwoofa');
                appealChannel.send(`${appealMember} Congrats, the bwoofas have fully welcomed you back into the pack. Better stay howling with your frens from now on!`);
            }
        }
        if (2 > totalVotes && totalVotes >= 1 && appealMember.id != '1242124604785557697' && appealMember.roles.cache.has(dawgTeamRole.id)) {
            if (!appealMember.roles.cache.has(bwoofaRole.id)) {
                // await appealMember.roles.remove(bwoofaRole);
                if (appealMember.roles.cache.has(badBorkersRole.id)) {
                    await appealMember.roles.remove(badBorkersRole);
                }
                if (!appealMember.roles.cache.has(fcfsBwoofaRole.id)) {
                    await appealMember.roles.add(fcfsBwoofaRole);
                    // client.highestRoleAchieved.set(appealMember.id, 'FCFS Bwoofa');
                    appealChannel.send(`${appealMember} The bwoofas have hesitantly invited you back into the pack. Will they fully welcome you back in though?`);
                }
            }
        }
        if (totalVotes < 1 && appealMember.id != '1242124604785557697' && appealMember.roles.cache.has(dawgTeamRole.id)) {
            if (!appealMember.roles.cache.has(bwoofaRole.id) && !appealMember.roles.cache.has(fcfsBwoofaRole.id)) {
                if (!appealMember.roles.cache.has(badBorkersRole.id)) {
                    // await appealMember.roles.remove(fcfsBwoofaRole);
                    await appealMember.roles.add(badBorkersRole);
                    appealChannel.send(
                        `<@${reaction.message.author.id}> Oops, you've stopped bwoofing with us 😦
                Now you are just a @Bad Borker.
                
                To bwoof with us again, ask @OG Bwoofa and @Bwoofa to invite you back into the pack!
                They might need a little convincin' though.
                
                Get 20+ 👍 from @OG Bwoofa and @Bwoofa you are back babyyyy.
                Get 10+ 👍, you get @FCFS Bwoofa role.
                If you get less than <10 👍, better try again later and be more convincing next time.`);
                }
            }
        }
    }
};

// Login to Bot with token
try {
    const token = process.env.BOT_TOKEN!;
    client.login(token);
} catch (error) {
    console.error(`Error login to BOT at index: ${error}`);
}