const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('spawnmeteorite')
		.setDescription('Suggests a meteor spawn point at a random (bounded) set of coordinates')
		.addIntegerOption(option =>
			option.setName('x-minimum')
				.setDescription('custom minimum x value to spawn meteor'))
		.addIntegerOption(option =>
			option.setName('x-maximum')
				.setDescription('custom maximum x value to spawn meteor'))
		.addIntegerOption(option =>
			option.setName('z-minimum')
				.setDescription('custom minimum z value to spawn meteor'))
		.addIntegerOption(option =>
			option.setName('z-maximum')
				.setDescription('custom maximum z value to spawn meteor')),
    async execute(interaction) {
		interaction.reply("Just a second...");
    },    
};