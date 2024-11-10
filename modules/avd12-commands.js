/* -------------------------------------------- */

import { Avd12Utility } from "./avd12-utility.js";
import { Avd12RollDialog } from "./dialog/avd12-roll-dialog.js";

/* -------------------------------------------- */
export class Avd12Commands {

  static init() {
    if (!game.system.avd12.commands) {
      const avd12Commands = new Avd12Commands();
      //crucibleCommands.registerCommand({ path: ["/char"], func: (content, msg, params) => crucibleCommands.createChar(msg), descr: "Create a new character" });
      //crucibleCommands.registerCommand({ path: ["/pool"], func: (content, msg, params) => crucibleCommands.poolRoll(msg), descr: "Generic Roll Window" });
      game.system.avd12.commands = avd12Commands;
    }
  }
  constructor() {
    this.commandsTable = {}
  }

  /* -------------------------------------------- */
  registerCommand(command) {
    this._addCommand(this.commandsTable, command.path, '', command);
  }

  /* -------------------------------------------- */
  _addCommand(targetTable, path, fullPath, command) {
    if (!this._validateCommand(targetTable, path, command)) {
      return;
    }
    const term = path[0];
    fullPath = fullPath + term + ' '
    if (path.length == 1) {
      command.descr = `<strong>${fullPath}</strong>: ${command.descr}`;
      targetTable[term] = command;
    }
    else {
      if (!targetTable[term]) {
        targetTable[term] = { subTable: {} };
      }
      this._addCommand(targetTable[term].subTable, path.slice(1), fullPath, command)
    }
  }

  /* -------------------------------------------- */
  _validateCommand(targetTable, path, command) {
    if (path.length > 0 && path[0] && command.descr && (path.length != 1 || targetTable[path[0]] == undefined)) {
      return true;
    }
    console.warn("crucibleCommands._validateCommand failed ", targetTable, path, command);
    return false;
  }


  /* -------------------------------------------- */
  /* Manage chat commands */
  processChatCommand(commandLine, content = '', msg = {}) {
    // Setup new message's visibility
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) msg["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "blindroll") msg["blind"] = true;
    msg["type"] = 0;

    let command = commandLine[0].toLowerCase();
    let params = commandLine.slice(1);

    return this.process(command, params, content, msg);
  }

  /* -------------------------------------------- */
  process(command, params, content, msg) {
    return this._processCommand(this.commandsTable, command, params, content, msg);
  }

  /* -------------------------------------------- */
  _processCommand(commandsTable, name, params, content = '', msg = {}, path = "") {
    let command = commandsTable[name];
    path = path + name + " ";
    if (command && command.subTable) {
      if (params[0]) {
        return this._processCommand(command.subTable, params[0], params.slice(1), content, msg, path)
      }
      else {
        this.help(msg, command.subTable);
        return true;
      }
    }
    if (command && command.func) {
      const result = command.func(content, msg, params);
      if (result == false) {
        CrucibleCommands._chatAnswer(msg, command.descr);
      }
      return true;
    }
    return false;
  }

  /* -------------------------------------------- */
  static _chatAnswer(msg, content) {
    msg.whisper = [game.user.id];
    msg.content = content;
    ChatMessage.create(msg);    
  }

  /* -------------------------------------------- */
  async poolRoll( msg) {
    let rollData = Avd12Utility.getBasicRollData()
    rollData.alias = "Dice Pool Roll", 
    rollData.mode  = "generic"
    rollData.title = `Dice Pool Roll`;
    
    let rollDialog = await Avd12RollDialog.create( this, rollData);
    rollDialog.render( true );
  }

}