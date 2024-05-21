const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pingings')
		.setDescription('Replies with Ponging!'),
	async execute(interaction) {
		await interaction.reply('Ponging!');
	},
};