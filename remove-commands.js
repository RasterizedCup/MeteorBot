const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { tokenTest } = require('./config.json');
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.TEST_GUILD_ID;
    
const rest = new REST({ version: '9' }).setToken(tokenTest);
rest.get(Routes.applicationCommands('1231656441526489138'))
    .then(data => {
        const promises = [];
        for (const command of data) {
            const deleteUrl = `${Routes.applicationCommands('1231656441526489138')}/${command.id}`;
            promises.push(rest.delete(deleteUrl));
        }
        return Promise.all(promises);
    });