const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder } = require('discord.js');
const { tokenTest, token, botID, botIDtest, cachedCommandChannel, meteorTrackingThread, roleRequirement, cachedCommandChannelTest, meteorTrackingThreadTest, roleRequirementTest } = require('./config.json');

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers ], 
    partials : ['CHANNEL', 'MESSAGE']}
);

client.login(token);

// slash command testing
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

const xMin = -10252;
const xMax = 18571;
const zMin = -9356;
const zMax = 19467;

var meteorConstraintsObj = {};

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

// end slash command testing

client.once('ready', () => {
	console.log('Ready [TEST]!');
    client.channels.fetch(cachedCommandChannel) // get staff bot spam here
    .then(channel =>{
        channel.messages.fetch();
        client.user.setActivity('Custom status Set!', {type: 4})
        //client.destroy();
    })
});

client.on('interactionCreate', async (interaction) =>{
    if(interaction.commandName === 'spawnmeteorite'){
        if(interaction.channel.id !== cachedCommandChannel)
            return;

        var msg = await interaction.channel.send("Building a meteor...");
        console.log(interaction);

        const xCustomMin = interaction.options.getInteger('x-minimum');
        const xCustomMax = interaction.options.getInteger('x-maximum');
        const zCustomMin = interaction.options.getInteger('z-minimum');
        const zCustomMax = interaction.options.getInteger('z-maximum');

        meteorConstraintsObj.xMin = (xCustomMin !== null && xCustomMin >= -10252) ? xCustomMin : -10252;
        meteorConstraintsObj.xMax = (xCustomMax !== null && xCustomMax <= 18571 && xCustomMax > xMin) ? xCustomMax : 18571;
        meteorConstraintsObj.zMin = (zCustomMin !== null && zCustomMin >= -9356) ? zCustomMin : -9356;
        meteorConstraintsObj.zMax = (zCustomMax !== null && zCustomMax <= 19467 && zCustomMax > zMin) ? zCustomMax : 19467;

        await handleMeteorMessage(msg); // find way to extract message from interaction
    }
})

client.on('messageReactionAdd', async (reaction, user) =>{
    console.log("reaction detected");
    if(user.id != botID){ // bot id
        switch (reaction.emoji.name){
            case "✅":
                handleMeteorSuccess(reaction);
                meteorConstraintsObj = {};
                break;
            case "🌊":
                handleMeteorRejection_OceanicError(reaction, await reaction.message.channel.messages.fetch(reaction.message.reference.messageId));
                break;
            case "❌":
                handleMeteorRejection_Standard(reaction);
                meteorConstraintsObj = {};
                break;
        }
    }
}); 

async function handleMeteorMessage(message){

    if((message.content === "!spawnmeteor" || message.content.includes("Building a meteor"))){ // role lock disabled
        const[x, z] = getMeteorLocation();
        const meteorSize = getMeteorSize()
        var msg = await message.reply(meteorSize + " Meteor Spawn Location: " + x.toFixed(0) + " " + z.toFixed(0));
    
        msg.react("✅");
        msg.react("🌊");
        msg.react("❌");
    }
   /*if(message.author.id == "1231656441526489138" && message.content.includes("Meteor Spawn Location")){
        message.react("✅");
        message.react("🌊");
        message.react("❌");
        // add reacts to change size
    } */

}

// CASE: good meteor position, log and confirm
function handleMeteorSuccess(reaction){
    var infoStr = reaction.message.content;
    var MeteorSize = infoStr.substring(0, infoStr.indexOf(" "));
    var MeteorPos = infoStr.substring(infoStr.indexOf(": ") + 2);
    var PosX = MeteorPos.substring(0, infoStr.indexOf(" "));
    var PosZ = MeteorPos.substring(infoStr.indexOf(" "));

    reaction.message.channel.send("New Meteor Logged")
    client.channels.fetch(meteorTrackingThread) // meteor tracking thread     
    .then(thread =>{
        var embedColor;
        switch(MeteorSize){
            case "TINY":
                embedColor = 0x64F000;
                break;
            case "SMALL":
                embedColor = 0xEEC200;
                break;
            case "MEDIUM":
                embedColor = 0xEE6800;
                break;
            case "LARGE":
                embedColor = 0xEE0500;
                break;
            default:
                break;
        }

        const meteorEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle("Meteor Information")
            .addFields(
                {name: 'Meteor Size', value: MeteorSize},
                {name: 'Meteor Coordinates', value: "[X: " + PosX + "] [Z: " + PosZ + "]"}
            )
        

        // implement database info here

        thread.send({embeds: [meteorEmbed]});
        reaction.message.delete();
    }) 
}

// CASE: meteor spot is rejected and invalid, blacklist in database, and surrounding spots up to blacklistRange amount
function handleMeteorRejection_OceanicError(reaction, message){

    // case if constraint object is null
    if(meteorConstraintsObj.xMin === undefined){
        meteorConstraintsObj.xMin = xMin;
        meteorConstraintsObj.xMax = xMax;
        meteorConstraintsObj.zMin = zMin;
        meteorConstraintsObj.zMax = zMax;
    }

    var infoStr = reaction.message.content;
    var MeteorPos = infoStr.substring(infoStr.indexOf(": ") + 2);
    var Positions = MeteorPos.match(/(-*\d+)/g);
    var PosX = Positions[0];
    var PosZ = Positions[1];
   // var PosX = MeteorPos.substring(0, infoStr.indexOf(" ") + 1);
   // var PosZ = MeteorPos.substring(infoStr.indexOf(" ") + 1);

    reaction.message.channel.send("Oceanic Error Logged, Position [X: " + PosX + "] [Z: " + PosZ +"] blacklisted (this does not work yet lol)")
    reaction.message.delete();
    handleMeteorMessage(message);
}  

// CASE: meteor spot is rejected, but not invalid. do not blacklist in database
function handleMeteorRejection_Standard(reaction){
    var infoStr = reaction.message.content;
    var MeteorPos = infoStr.substring(infoStr.indexOf(": ") + 2);
    var Positions = MeteorPos.match(/(-*\d+)/g);
    var PosX = Positions[0];
    var PosZ = Positions[1];
    // var PosX = MeteorPos.substring(0, infoStr.indexOf(" "));
    // var PosZ = MeteorPos.substring(infoStr.indexOf(" "));

    reaction.message.channel.send("Meteor position [X: " + PosX + "] [Z: " + PosZ +"]  rejected, not blacklisted")
    reaction.message.delete();
}

function getMeteorLocation(){
    var xVal = Math.random() * (meteorConstraintsObj.xMax - meteorConstraintsObj.xMin) + meteorConstraintsObj.xMin;
    var zVal = Math.random() * (meteorConstraintsObj.zMax - meteorConstraintsObj.zMin) + meteorConstraintsObj.zMin;
    return [xVal, zVal];
}

function getMeteorSize(){
    var val = Math.random() * (100 - 0) + 0; // 0-100 random number
    const tinyChance = 60
    const smallChance = tinyChance + 27;
    const mediumChance = smallChance + 10;
    console.log(val)
    switch(true){ // check if these conditions are true
        case (val < tinyChance):
            return "TINY";
        case (val < smallChance):
            return "SMALL";
        case (val < mediumChance):
            return "MEDIUM";
        default:
            return "LARGE";
    }
}
// 1231656441526489138 bot id
// 1231656441526489138 bot test id
// 1231673972911767712 test role lock
// 1177200503810179103 - admin role lock
// 1177206720368488488 - staff bot spam 1177206720368488488
// 1228317548991352934 - meteor tracking thread 1228317548991352934
// 1231682674490605708 - test tracking thread
// size distro: 60% tiny, 27& small, 10% medium, 3% large