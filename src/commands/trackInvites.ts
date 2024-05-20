import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('trackinvites')
    .setDescription('Check the number of invites a user has')
    .addUserOption(option => 
        option.setName('user')
            .setDescription('The user to check invites for')
            .setRequired(true)
    );

export const execute = async (interaction: CommandInteraction) => {
    const user = interaction.options.get('user')?.user;
    if (!user) {
        await interaction.reply({ content: 'User not found', ephemeral: true });
        return;
    }

    const member = await interaction.guild!.members.fetch(user.id);
    const invites = await interaction.guild!.invites.fetch();

    const userInvites = invites.filter(invite => invite.inviter?.id === user.id);
    let inviteCount = 0;

    userInvites.forEach(invite => {
        inviteCount += invite.uses!;
    });

    await interaction.reply(`${member.user.tag} has ${inviteCount} invites.`);
};