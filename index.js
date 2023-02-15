const Discord = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const fs = require("fs");
const { Player } = require("discord-player");
const { Client, GatewayIntentBits, } = require('discord.js');

const LOAD_SLASH = process.argv[2] == "load";

const { TOKEN, CLIENT_ID } = require("./config.json");

const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.slashcommands = new Discord.Collection();
client.player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25
  }
});

let commands = [];

const slashFiles = fs.readdirSync("./slash").filter(file => file.endsWith(".js"));
for (const file of slashFiles) {
  const slashcmd = require(`./slash/${file}`);
  client.slashcommands.set(slashcmd.data.name, slashcmd);
  if (LOAD_SLASH) commands.push(slashcmd.data.toJSON());
}
if (LOAD_SLASH) {
  client.on("ready", () => {
    const GUILDS_LIST = client.guilds.cache.map(guild => guild.id);
    const rest = new REST({ version: "9" }).setToken(TOKEN);
    const promises = [];

    GUILDS_LIST.forEach(GUILD_ID => {
      console.log("Deploying slash commands for guild", GUILD_ID);
      promises.push(rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands }));
    });

    Promise.all(promises)
      .then(() => {
        console.log("Successfully loaded");
        process.exit(0);
      })
      .catch((err) => {
        if (err) {
          console.log(err);
          process.exit(1);
        }
      });
  });
  client.login(TOKEN);
}
else {
  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
  });
  client.on("interactionCreate", (interaction) => {
    async function handleCommand() {
      if (!interaction.isCommand()) return;

      const slashcmd = client.slashcommands.get(interaction.commandName);
      if (!slashcmd) interaction.reply("Not a valid slash command");

      await interaction.deferReply();
      await slashcmd.run({ client, interaction });
    }
    handleCommand();
  });
  client.login(TOKEN);
}
