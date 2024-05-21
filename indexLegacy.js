const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder } = require('discord.js');
const { token, botID, cachedCommandChannel, meteorTrackingThread, roleRequirement } = require('./config.json');

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers ], 
    partials : ['CHANNEL', 'MESSAGE']}
);

client.login(token);

client.once('ready', () => {
	console.log('Ready [PRODUCTION]!');
    client.channels.fetch(cachedCommandChannel) // get staff bot spam here
    .then(channel =>{
        channel.messages.fetch();
    })
});


client.on('messageCreate', async message => {
    //console.log(message.content);
    handleMeteorMessage(message);
})

client.on('messageReactionAdd', async (reaction, user) =>{
    console.log("reaction detected");
    if(user.id != botID){ // bot id
        //reaction.message.reply("reaction of " + reaction.emoji.name + " was added");

        switch (reaction.emoji.name){
            case "✅":
                handleMeteorSuccess(reaction);
                break;
            case "🌊":
                handleMeteorRejection_OceanicError(reaction, await reaction.message.channel.messages.fetch(reaction.message.reference.messageId));
                break;
            case "❌":
                handleMeteorRejection_Standard(reaction);
                break;
        }

      
    }
}); 

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
    var infoStr = reaction.message.content;
    var MeteorPos = infoStr.substring(infoStr.indexOf(": ") + 2);
    var Positions = MeteorPos.match(/(-*\d+)/g);
    var PosX = Positions[0];
    var PosZ = Positions[1];

    reaction.message.channel.send("Oceanic Error Logged, Position [X: " + PosX + "] [Z: " + PosZ +"] blacklisted (THIS DON'T WORK YET)")
    reaction.message.delete();
    handleMeteorMessage(message);
}

// CASE: meteor spot is rejected, but not invalid. do not blacklist in database
function handleMeteorRejection_Standard(reaction){
    var infoStr = reaction.message.content;
    var MeteorPos = infoStr.substring(infoStr.indexOf(": ") + 2);
    var PosX = MeteorPos.substring(0, infoStr.indexOf(" "));
    var PosZ = MeteorPos.substring(infoStr.indexOf(" "));

    reaction.message.channel.send("Meteor position [X: " + PosX + "] [Z: " + PosZ +"]  rejected, not blacklisted")
    reaction.message.delete();
}

function getMeteorLocation(){
    // temp hardcoded until database
    const xMin = -10252;
    const xMax = 18571;
    const zMin = -9356;
    const zMax = 19467;

    var xVal = Math.random() * (xMax - xMin) + xMin;
    var zVal = Math.random() * (zMax - zMin) + zMin;
    return [xVal, zVal];
}

function getMeteorSize(){
    var val = Math.random() * (100 - 0) + 0;
    const smallChance = 80;
    const mediumChance = smallChance + 15;
    console.log(val)
    switch(true){ // check if these conditions are true
        case (val < smallChance):
            return "SMALL";
        case (val < mediumChance):
            return "MEDIUM";
        default:
            return "LARGE";
    }
}

function handleMeteorMessage(message){
    if(message.content === "!SpawnMeteor" && message.member.roles.cache.has(roleRequirement)){ // role lock
        const[x, z] = getMeteorLocation();
        const meteorSize = getMeteorSize()
        message.reply(meteorSize + " Meteor Spawn Location: " + x.toFixed(0) + " " + z.toFixed(0))
    }
    if(message.author.id == botID && message.content.includes("Meteor Spawn Location")){
        message.react("✅");
        message.react("🌊");
        message.react("❌");
        // add reacts to change size
    } 
}

// 1231656441526489138 bot id
// 1231673972911767712 test role lock
// 1177200503810179103 - admin role lock
// 1177206720368488488 - staff bot spam
// 1228317548991352934 - meteor tracking thread
// 1231682674490605708 - test tracking thread
// size distro: 80& small, 15% medium, 5% large