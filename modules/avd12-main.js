/**
 * AVD12 system
 * Author: Uberwald
 * Software License: Prop
 */

/* -------------------------------------------- */

/* -------------------------------------------- */
// Import Modules
import { Avd12Actor } from "./avd12-actor.js";
import { Avd12ItemSheet } from "./sheets/avd12-item-sheet.js";
import { Avd12ActorSheet } from "./sheets/avd12-actor-sheet.js";
import { Avd12ExpeditionSheet } from "./sheets/avd12-expedition-sheet.js";
import { Avd12NPCSheet } from "./sheets/avd12-npc-sheet.js";
import { Avd12Utility } from "./avd12-utility.js";
import { Avd12Combat } from "./avd12-combat.js";
import { Avd12Item } from "./avd12-item.js";
import { Avd12Hotbar } from "./avd12-hotbar.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/************************************************************************************/
Hooks.once("init", async function () {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalError = console.error;

  const ignorePatterns = /deprecated|Foundry VTT/i;

  console.logAVD12 = function (...args) {
    const style = `
        background: linear-gradient(to right, #ff8a00, #e52e71);
        border-radius: 4px;
        color: white;
        padding: 2px 6px;
        font-weight: bold;
        font-family: Arial, sans-serif;
    `;
    console.log("%c[AVD12]", style, ...args);
  };


  /*
  console.log = function (...args) {
    if (!ignorePatterns.test(args[0])) {
      originalLog.apply(console, args);
    }
  };

  console.warn = function (...args) {
    if (!ignorePatterns.test(args[0])) {
      originalWarn.apply(console, args);
    }
  };

  console.info = function (...args) {
    if (!ignorePatterns.test(args[0])) {
      originalInfo.apply(console, args);
    }
  };

  console.error = function (...args) {
    if (!ignorePatterns.test(args[0])) {
      originalError.apply(console, args);
    }
  };
*/
  console.log(`Initializing AVD12 RPG`);

  game.system.avd12 = {
    Avd12Hotbar,
  };

  // preload handlebars templates
  Avd12Utility.preloadHandlebarsTemplates();

  // Set an initiative formula for the system
  CONFIG.Combat.initiative = {
    formula: "1d12",
    decimals: 1,
  };

  game.socket.on("system.avd12", (data) => {
    Avd12Utility.onSocketMesssage(data);
  });

  // Define custom Entity classes
  CONFIG.Combat.documentClass = Avd12Combat;
  CONFIG.Actor.documentClass = Avd12Actor;
  CONFIG.Item.documentClass = Avd12Item;
  CONFIG.Combatant;

  /* -------------------------------------------- */
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("avd12", Avd12ActorSheet, { types: ["character"], makeDefault: true });
  Actors.registerSheet("avd12", Avd12NPCSheet, { types: ["npc"], makeDefault: false });
  Actors.registerSheet("avd12", Avd12ExpeditionSheet, { types: ["expedition"], makeDefault: false });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("avd12", Avd12ItemSheet, { makeDefault: true });

  Avd12Utility.init();
});

function registerModules() {
  if (game.modules.has("splatter")) {
    if (game.modules.get("splatter").active) {
      console.log("AVD12: Registering Splatter blood colors");
      const bloodSheetData = {
        beast: "#ff0000d5",
        construct: "#3b3b3bd8",
        dark: "#800080d5",
        divine: "#ffd700d8",
        elemental: "#00ced1d8",
        fey: "#ff69b4d8",
        humanoid: "#ff6347d8",
        monster: "#800000d8",
        plantoid: "#32cd32d8",
        undead: "#ffffff00",
      };
      game.settings.set("splatter", "BloodSheetData", bloodSheetData);
    }
  }

  if (game.modules.get("healthEstimate")?.active) {
    const defaultFractionHPPath = "actor.system.health";
    let fractionHPPath = game.settings.get("healthEstimate", "core.custom.FractionHP");
    if (!fractionHPPath) {
      game.settings.set("healthEstimate", "core.custom.FractionHP", defaultFractionHPPath);
    }
  }
}

/* -------------------------------------------- */
function welcomeMessage() {
  ChatMessage.create({
    user: game.user.id,
    whisper: [game.user.id],
    content: `<div id="welcome-message-avd12"><span class="rdd-roll-part">
    <strong>Welcome to the AVD12 RPG.</strong>
    `,
  });
}

Hooks.once("ready", function () {
  registerModules();
  //load after
  CONFIG.statusEffects = [
    {
      id: "dead",
      label: "Dead",
      icon: "systems/avd12/images/conditions/dead.svg",
    },
    {
      id: "unconscious",
      label: "Unconscious",
      icon: "systems/avd12/images/conditions/unconscious.svg",
    },
    {
      id: "sleeping",
      label: "Sleeping",
      icon: "systems/avd12/images/conditions/sleeping.svg",
    },
    {
      id: "enveloped",
      label: "Enveloped",
      icon: "systems/avd12/images/conditions/enveloped.svg",
    },
    {
      id: "trapped",
      label: "Trapped",
      icon: "systems/avd12/images/conditions/trapped.svg",
    },
    {
      id: "alert",
      label: "Alert",
      icon: "systems/avd12/images/conditions/alert.svg",
    },
    {
      id: "flying",
      label: "Flying",
      icon: "systems/avd12/images/conditions/fly.svg",
    },
    {
      id: "dazed",
      label: "Dazed",
      icon: "systems/avd12/images/conditions/dazed.svg",
    },
    {
      id: "stunned",
      label: "Stunned",
      icon: "systems/avd12/images/conditions/stunned.svg",
    },
    {
      id: "confused",
      label: "Confused",
      icon: "systems/avd12/images/conditions/confused.svg",
    },
    {
      id: "prone",
      label: "Prone",
      icon: "systems/avd12/images/conditions/prone.svg",
    },
    {
      id: "grappled",
      label: "Grappled",
      icon: "systems/avd12/images/conditions/grappled.svg",
    },
    {
      id: "paralyzed",
      label: "Paralyzed",
      icon: "systems/avd12/images/conditions/paralyzed.svg",
    },
    {
      id: "charmed",
      label: "Charmed",
      icon: "systems/avd12/images/conditions/charmed.svg",
    },
    {
      id: "blind",
      label: "Blinded",
      icon: "systems/avd12/images/conditions/blind.svg",
    },
    {
      id: "deafened",
      label: "Deafened",
      icon: "systems/avd12/images/conditions/deafened.svg",
    },
    {
      id: "maddened",
      label: "Maddened",
      icon: "systems/avd12/images/conditions/maddened.svg",
    },
    {
      id: "muted",
      label: "Muted",
      icon: "systems/avd12/images/conditions/muted.svg",
    },
    {
      id: "stasis",
      label: "Statis",
      icon: "systems/avd12/images/conditions/stasis.svg",
    },
    {
      id: "afraid",
      label: "Afraid",
      icon: "systems/avd12/images/conditions/afraid.svg",
    },
    {
      id: "ignited",
      label: "Ignited",
      icon: "systems/avd12/images/conditions/ignited.svg",
    },
    {
      id: "frozen",
      label: "Frozen",
      icon: "systems/avd12/images/conditions/frozen.svg",
    },
    {
      id: "bleeding",
      label: "Bleeding",
      icon: "systems/avd12/images/conditions/bleeding.svg",
    },
    {
      id: "diseased",
      label: "Diseased",
      icon: "systems/avd12/images/conditions/diseased.svg",
    },
    {
      id: "poisoned",
      label: "Poisoned",
      icon: "systems/avd12/images/conditions/poisoned.svg",
    },
    {
      id: "invisible",
      label: "Invisible",
      icon: "systems/avd12/images/conditions/invisible.svg",
    },
    {
      id: "hidden",
      label: "Hidden",
      icon: "systems/avd12/images/conditions/hidden.svg",
    },
    {
      id: "partialcover",
      label: "Partial Cover",
      icon: "systems/avd12/images/conditions/partialcover.svg",
    },
    {
      id: "fullcover",
      label: "Full Cover",
      icon: "systems/avd12/images/conditions/fullcover.svg",
    },
    {
      id: "exhausted1",
      label: "Exhausted - Tier 1",
      icon: "systems/avd12/images/conditions/exhaustT1.svg",
    },
    {
      id: "exhausted2",
      label: "Exhausted - Tier 2",
      icon: "systems/avd12/images/conditions/exhaustT2.svg",
    },
    {
      id: "exhausted3",
      label: "Exhausted - Tier 3",
      icon: "systems/avd12/images/conditions/exhaustT3.svg",
    },
    {
      id: "wounded1",
      label: "Wounded - Tier 1",
      icon: "systems/avd12/images/conditions/woundedT1.svg",
    },
    {
      id: "wounded2",
      label: "Wounded - Tier 2",
      icon: "systems/avd12/images/conditions/woundedT2.svg",
    },
    {
      id: "wounded3",
      label: "Wounded - Tier 3",
      icon: "systems/avd12/images/conditions/woundedT3.svg",
    },
    {
      id: "encumbered",
      label: "Encumbered",
      icon: "systems/avd12/images/conditions/encumbered.svg",
    },
    {
      id: "focusing",
      label: "Focusing",
      icon: "systems/avd12/images/conditions/focus.svg",
    },
    {
      id: "lightsource",
      label: "Light Source",
      icon: "systems/avd12/images/conditions/light.svg",
    },
  ];

  // User warning
  if (!game.user.isGM && game.user.character == undefined) {
    ui.notifications.info("Warning ! No character linked to your user !");
    ChatMessage.create({
      content: "<b>WARNING</b> The player  " + game.user.name + " is not linked to a character !",
      user: game.user._id,
    });
  }

  // CSS patch for v9
  if (game.version) {
    let sidebar = document.getElementById("sidebar");
    sidebar.style.width = "min-content";
  }

  Avd12Utility.ready();
  Avd12Utility.init();
});

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.on("chatMessage", (html, content, msg) => {
  if (content[0] == "/") {
    let regExp = /(\S+)/g;
    let commands = content.match(regExp);
    if (game.system.avd12.commands.processChatCommand(commands, content, msg)) {
      return false;
    }
  }
  return true;
});
