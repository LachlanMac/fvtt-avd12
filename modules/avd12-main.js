/**
 * AVD12 system
 * Author: Uberwald
 * Software License: Prop
 */

/* -------------------------------------------- */

/* -------------------------------------------- */
// Import Modules
import { Avd12Actor } from "./avd12-actor.js";
import { Avd12ItemSheet } from "./avd12-item-sheet.js";
import { Avd12ActorSheet } from "./avd12-actor-sheet.js";
import { Avd12NPCSheet } from "./avd12-npc-sheet.js";
import { Avd12Utility } from "./avd12-utility.js";
import { Avd12Combat } from "./avd12-combat.js";
import { Avd12Item } from "./avd12-item.js";
import { Avd12Hotbar } from "./avd12-hotbar.js"


/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/************************************************************************************/
Hooks.once("init", async function () {

  console.log(`Initializing AVD12 RPG`);
  
  game.system.avd12 = {
    Avd12Hotbar
  }

  /* -------------------------------------------- */
  // preload handlebars templates
  Avd12Utility.preloadHandlebarsTemplates();

  /* -------------------------------------------- */
  // Set an initiative formula for the system 
  CONFIG.Combat.initiative = {
    formula: "1d6",
    decimals: 1
  };

  /* -------------------------------------------- */
  game.socket.on("system.fvtt-avd12", data => {
    Avd12Utility.onSocketMesssage(data)
  });

  /* -------------------------------------------- */
  // Define custom Entity classes
  CONFIG.Combat.documentClass = Avd12Combat
  CONFIG.Actor.documentClass = Avd12Actor
  CONFIG.Item.documentClass = Avd12Item

  /* -------------------------------------------- */
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("fvtt-avd12", Avd12ActorSheet, { types: ["character"], makeDefault: true });
  Actors.registerSheet("fvtt-avd12", Avd12NPCSheet, { types: ["npc"], makeDefault: false });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("fvtt-avd12", Avd12ItemSheet, { makeDefault: true });

  Avd12Utility.init()
});


/* -------------------------------------------- */
function welcomeMessage() {
  ChatMessage.create({
    user: game.user.id,
    whisper: [game.user.id],
    content: `<div id="welcome-message-avd12"><span class="rdd-roll-part">
    <strong>Welcome to the AVD12 RPG.</strong>
    ` });
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("ready", function () {

  // User warning
  if (!game.user.isGM && game.user.character == undefined) {
    ui.notifications.info("Warning ! No character linked to your user !");
    ChatMessage.create({
      content: "<b>WARNING</b> The player  " + game.user.name + " is not linked to a character !",
      user: game.user._id
    });
  }
  
  // CSS patch for v9
  if (game.version) {
    let sidebar = document.getElementById("sidebar");
    sidebar.style.width = "min-content";
  }

  welcomeMessage();
  Avd12Utility.ready()
  Avd12Utility.init()
})

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.on("chatMessage", (html, content, msg) => {
  if (content[0] == '/') {
    let regExp = /(\S+)/g;
    let commands = content.match(regExp);
    if (game.system.avd12.commands.processChatCommand(commands, content, msg)) {
      return false;
    }
  }
  return true;
});

