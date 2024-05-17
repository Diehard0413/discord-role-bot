require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

const GUILD_ID = process.env.GUILD_ID;

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
        const bwoofaRole = guild.roles.cache.find(role => role.name === 'Bwoofa');
        
        if (inviteCount >= 5 && inviter.roles.cache.has(ogRole.id)) {
            inviter.roles.add(ogRole);
        } else if (inviteCount < 5) {
            inviter.roles.add(borkerRole);
        }

        // If there are additional roles for lower invite counts, add them here
    }
});

client.on('messageCreate', async message => {
    const member = message.member;

    if (!member) return;

    const bwoofaRole = message.guild.roles.cache.find(role => role.name === 'Bwoofa');
    const borkerRole = message.guild.roles.cache.find(role => role.name === 'Borker');

    if (member.roles.cache.has(bwoofaRole.id)) {
        member.lastMessageTime = Date.now();
    }

    setInterval(async () => {
        const now = Date.now();
        const timeDiff = now - (member.lastMessageTime || now);

        if (timeDiff > 3 * 24 * 60 * 60 * 1000 && member.roles.cache.has(bwoofaRole.id)) {
            await member.roles.remove(bwoofaRole);
            await member.roles.add(borkerRole);
        }
    }, 24 * 60 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);