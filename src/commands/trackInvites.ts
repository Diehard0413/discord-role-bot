import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { db } from '../database';

export const data = new SlashCommandBuilder()
    .setName('queryinvites')
    .setDescription('Check the number of invites and invitee IDs for a user')
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

    try {
        const inviterId = user.id;

        // Fetch invite count
        const inviteCountResult = await db.query(`
            SELECT invite_count FROM invite_tracking WHERE inviter_id = $1
        `, [inviterId]);

        const inviteCount = inviteCountResult.rows[0] ? inviteCountResult.rows[0].invite_count : 0;

        // Fetch invitee IDs
        const inviteeIdsResult = await db.query(`
            SELECT member_id FROM member_invites WHERE inviter_id = $1
        `, [inviterId]);

        const inviteeIds = inviteeIdsResult.rows.map(row => row.member_id);

        // Respond with the data
        await interaction.reply({
            content: `${user.tag} has invited ${inviteCount} members.\nInvitee IDs: ${inviteeIds.join(', ')}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error querying invites:', error);
        await interaction.reply({ content: 'There was an error while querying invites.', ephemeral: true });
    }
};