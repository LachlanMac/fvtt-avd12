/* -------------------------------------------- */
import { Avd12Actor } from "./avd12-actor.js";
import { Avd12Combat } from "./avd12-combat.js";
import { Avd12Commands } from "./avd12-commands.js";

/* -------------------------------------------- */
const __ALLOWED_MODULE_TYPES = { "action": 1, "reaction": 1, "freeaction": 1, "trait": 1 }
const __focusCore = { "corenone": 0, "core5gp": 6, "core20gp": 8, "core50gp": 10, "core100gp": 12, "core300gp": 16, "core500gp": 20, "core800gp": 26, "core1000gp": 32 }
const __burnChanceTreatment = { "treatmentnone": 0, "treatment5gp": 8, "treatment20gp": 7, "treatment50gp": 6, "treatment100gp": 5, "treatment500gp": 4, "treatment1000gp": 3, "treatment5000gp": 2, "treatment10000gp": 1 }
const __focusPointTreatment = { "treatmentnone": 0, "treatment5gp": 0, "treatment20gp": 1, "treatment50gp": 2, "treatment100gp": 4, "treatment500gp": 6, "treatment1000gp": 8, "treatment5000gp": 14, "treatment10000gp": 20 }
const __focusRegenBond = { "bondnone": 6, "bondeasy": 8, "bondcommon": 12, "bonduncommon": 16, "bondrare": 22, "bondlegendary": 26, "bondmythic": 36, "bonddivine": 48 }
const __bonusSpellDamageBond = { "bondnone": 0, "bondeasy": 1, "bondcommon": 1, "bonduncommon": 1, "bondrare": 2, "bondlegendary": 2, "bondmythic": 3, "bonddivine": 4 }
const __bonusSpellAttackBond = { "bondnone": 0, "bondeasy": 0, "bondcommon": 1, "bonduncommon": 1, "bondrare": 2, "bondlegendary": 2, "bondmythic": 3, "bonddivine": 4 }
const __spellCost = { "beginner": 1, "novice": 2, "journeyman": 4, "expert": 8, "master": 16, "grandmaster": 32 }
const __armorPenalties = {"light": { block: -2, dodge: -1}, 
    "medium": { dodge: -3, block: -2, castingtime: 1, stealth: -2, speed: -1}, 
    "heavy": { dodge: -4, block: -3, stealth: -3, castingtime: 2, speed: -3 },
     "ultraheavy": { dodge: -5, block: -4, stealth: -5, castingtime: 2, speed: -3 }, 
    "lightshield": {dodge: -1, block: +1}, 
    "heavyshield": {dodge: -2, block: 2, speed: -1, stealth: -1} }
/* -------------------------------------------- */
export class Avd12Utility {

  static getMappedValue(actor, key){
    switch(key){
      case "@thename":
        return "The " + actor.name;
      case "@name":
        return actor.name;
      case "@damage":
        return actor.system.bonus.npc.attack_power;
      case "@sdamage":
        return actor.system.bonus.npc.spell_power;
      case "@attack":
        return actor.system.bonus.npc.attack_accuracy;
      case "@sattack":
          return actor.system.bonus.npc.spell_accuracy; 
      case "@dodge":
        return actor.system.attributes.agility.skills.dodge.finalvalue; 
      
      default:
        return -1;
    }
  }


  static displayChatActionButtons(message, html, data) {
    const chatCard = html.find(".avd12-use-action");
    if ( chatCard.length > 0 ) {
      // If the user is the message author or the actor owner, proceed
      let actor = game.actors.get(data.message.speaker.actor);
      if ( actor && actor.isOwner ) {
        const buttons = chatCard.find("button[data-action]");
        return;
      }
      else if ( game.user.isGM || (data.author.id === game.user.id)) return;
      // Otherwise conceal action buttons except for saving throw
      const buttons = chatCard.find("button[data-action]");
      buttons.each((i, btn) => {
        if ( btn.dataset.action === "save" ) return;
        btn.style.display = "none";
      });
    }

    const spellCard = html.find(".avd12-use-spell");
    if ( spellCard.length > 0 ) {
      // If the user is the message author or the actor owner, proceed
      let actor = game.actors.get(data.message.speaker.actor);
      if ( actor && actor.isOwner ) {
        const buttons = spellCard.find("button[data-spell]");
        return;
      }
      else if ( game.user.isGM || (data.author.id === game.user.id)) return;
      // Otherwise conceal action buttons except for saving throw
      const buttons = spellCard.find("button[data-spell]");
      buttons.each((i, btn) => {
        if ( btn.dataset.action === "save" ) return;
        btn.style.display = "none";
      });
    }
  }

  /* -------------------------------------------- */
  static async init() {
    Hooks.on('renderChatLog', (log, html, data) => Avd12Utility.chatListeners(html));
    Hooks.on("renderChatMessage", Avd12Utility.displayChatActionButtons);

    this.rollDataStore = {}
    this.defenderStore = {}

    Avd12Commands.init();

    Handlebars.registerHelper('count', function (list) {
      return list.length;
    })

    Handlebars.registerHelper('map', function (text, actor) {
      let parseTokens = Avd12Utility.findAtTokens(text)
      for(let i =0; i < parseTokens.length; i++){
        let val = Avd12Utility.getMappedValue(actor, parseTokens[i])
        if(val == "-1"){
            text = text.replace(parseTokens[i], "");
        }else{
            text = text.replace(parseTokens[i], val);
        }
      }
      return text
    })

    Handlebars.registerHelper('includes', function (array, val) {
      return array.includes(val);
    })
    Handlebars.registerHelper('upper', function (text) {
      return text.toUpperCase();
    })
    Handlebars.registerHelper('lower', function (text) {
      return text.toLowerCase()
    })
    Handlebars.registerHelper('upperFirst', function (text) {
      if (typeof text !== 'string') return text
      return text.charAt(0).toUpperCase() + text.slice(1)
    })
    Handlebars.registerHelper('notEmpty', function (list) {
      return list.length > 0;
    })
    Handlebars.registerHelper('mul', function (a, b) {
      return parseInt(a) * parseInt(b);
    })
    Handlebars.registerHelper('add', function (a, b) {
      return parseInt(a) + parseInt(b);
    })

    Handlebars.registerHelper('sub', function (a, b) {
      return parseInt(a) - parseInt(b);
    })
  }

  /*-------------------------------------------- */
  static upperFirst(text) {
    if (typeof text !== 'string') return text
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  /*-------------------------------------------- */
  static getSkills() {
    return duplicate(this.skills)
  }
  /*-------------------------------------------- */
  static getWeaponSkills() {
    return duplicate(this.weaponSkills)
  }
  /*-------------------------------------------- */
  static getShieldSkills() {
    return duplicate(this.shieldSkills)
  }

  /* -------------------------------------------- */
  static isModuleItemAllowed(type) {
    return __ALLOWED_MODULE_TYPES[type]
  }

  /* -------------------------------------------- */
  static buildBonusList() {
    let bonusList = []
    for (let key in game.system.model.Actor.character.bonus) {
      let bonuses = game.system.model.Actor.character.bonus[key]
      for (let bonus in bonuses) {
        bonusList.push(key + "." + bonus)
      }
    }
    for (let key in game.system.model.Actor.character.attributes) {
      let attrs = game.system.model.Actor.character.attributes[key]
      for (let skillKey in attrs.skills) {
        bonusList.push(key + ".skills." + skillKey + ".modifier")
      }
    }
    for (let key in game.system.model.Actor.character.universal.skills) {
      bonusList.push("universal.skills." + key + ".modifier")
    }
    for (let key in game.system.model.Actor.character.mitigation) {
      bonusList.push("mitigation." + key + ".value")
    }

    bonusList.push("mitigation.elemental.value");
    return bonusList
  }

  /* -------------------------------------------- */
  static async ready() {
    const skills = await Avd12Utility.loadCompendium("avd12.skills")
    this.skills = skills.map(i => i.toObject())
    this.weaponSkills = duplicate(this.skills.filter(item => item.system.isweaponskill))
    this.shieldSkills = duplicate(this.skills.filter(item => item.system.isshieldskill))

    const rollTables = await Avd12Utility.loadCompendium("avd12.rolltables")
    this.rollTables = rollTables.map(i => i.toObject())

  }

  static setPluginData(){
  

  }

  /* -------------------------------------------- */
  static async loadCompendiumData(compendium) {
    
    const pack = game.packs.get(compendium)
    return await pack?.getDocuments() ?? []
  }

  /* -------------------------------------------- */
  static async loadCompendium(compendium, filter = item => true) {
    let compendiumData = await Avd12Utility.loadCompendiumData(compendium)
    return compendiumData.filter(filter)
  }

  /* -------------------------------------------- */
  static isArmorLight(armor) {
    if (armor && (armor.system.armortype.includes("light") || armor.system.armortype.includes("clothes"))) {
      return true
    }
    return false
  }

  /* -------------------------------------------- */
  static async chatListeners(html) {
    html.on("click", '.view-item-from-chat', event => {
      game.system.avd12.creator.openItemView(event)
    })
    html.on("click", '.roll-defense-melee', event => {
      let rollId = $(event.currentTarget).data("roll-id")
      let rollData = Avd12Utility.getRollData(rollId)
      rollData.defenseWeaponId = $(event.currentTarget).data("defense-weapon-id")
      let actor = game.canvas.tokens.get(rollData.defenderTokenId).actor
      if (actor && (game.user.isGM || actor.isOwner)) {
        actor.rollDefenseMelee(rollData)
      }
    })
    html.on("click", '.roll-defense-ranged', event => {
      let rollId = $(event.currentTarget).data("roll-id")
      let rollData = Avd12Utility.getRollData(rollId)
      let defender = game.canvas.tokens.get(rollData.defenderTokenId).actor
      if (defender && (game.user.isGM || defender.isOwner)) {
        defender.rollDefenseRanged(rollData)
      }
    })

    Avd12Actor.chatListener(html);

  }

  /* -------------------------------------------- */
  static async preloadHandlebarsTemplates() {

    const templatePaths = [
      'systems/avd12/templates/actors/editor-notes-gm.hbs',
      'systems/avd12/templates/items/partial-item-nav.hbs',
      'systems/avd12/templates/items/partial-item-description.hbs',
      'systems/avd12/templates/items/partial-common-item-fields.hbs',
      'systems/avd12/templates/items/partial-options-damage-types.hbs',
      'systems/avd12/templates/items/partial-options-weapon-types.hbs',
      'systems/avd12/templates/items/partial-options-weapon-categories.hbs',
      'systems/avd12/templates/items/partial-options-attributes.hbs',
      'systems/avd12/templates/items/partial-options-equipment-types.hbs',
      'systems/avd12/templates/items/partial-options-armor-types.hbs',
      'systems/avd12/templates/items/partial-options-spell-types.hbs',
      'systems/avd12/templates/items/partial-options-spell-levels.hbs',
      'systems/avd12/templates/items/partial-options-spell-schools.hbs',
      'systems/avd12/templates/items/partial-options-focus-bond.hbs',
      'systems/avd12/templates/items/partial-options-focus-treatment.hbs',
      'systems/avd12/templates/items/partial-options-focus-core.hbs',
      'systems/avd12/templates/items/partial-options-crit-level.hbs',
      'systems/avd12/templates/items/partial-options-attack-type.hbs',
      'systems/avd12/templates/items/partial-options-skills.hbs',
      'systems/avd12/templates/items/partial-rollable.hbs',
      'systems/avd12/templates/actors/partials/moves.hbs',
      'systems/avd12/templates/actors/partials/skills.hbs',
      'systems/avd12/templates/actors/partials/defense.hbs',
      'systems/avd12/templates/actors/partials/offense.hbs',
      'systems/avd12/templates/actors/partials/traits.hbs',
      'systems/avd12/templates/actors/partials/header.hbs',
      'systems/avd12/templates/actors/partials/spells.hbs',
      'systems/avd12/templates/actors/partials/equipment.hbs',
      'systems/avd12/templates/actors/partials/weapons.hbs',
      'systems/avd12/templates/actors/partials/biography.hbs',
      'systems/avd12/templates/actors/partials/crafting.hbs',
      'systems/avd12/templates/actors/partials/modules.hbs',
      'systems/avd12/templates/actors/partials/navigation.hbs',
      'systems/avd12/templates/actors/partials/creature-type.hbs',
      'systems/avd12/templates/items/partial-item-light.hbs',
      'systems/avd12/templates/items/partial-options-light-animation.hbs',
      
    ]
    return loadTemplates(templatePaths);
  }

  static getSize(value){
    switch(Number(value)){
      case 1: 
        return "Tiny";
      case 2: 
        return "Small";
      case 3: 
        return "Medium";
      case 4: 
        return "Large";
      case 5: 
        return "Huge";
      case 6: 
        return "Gargantuan";
    }
  }

  /* -------------------------------------------- */
  static removeChatMessageId(messageId) {
    if (messageId) {
      game.messages.get(messageId)?.delete();
    }
  }

  static findChatMessageId(current) {
    return Avd12Utility.getChatMessageId(Avd12Utility.findChatMessage(current));
  }

  static getChatMessageId(node) {
    return node?.attributes.getNamedItem('data-message-id')?.value;
  }

  static findChatMessage(current) {
    return Avd12Utility.findNodeMatching(current, it => it.classList.contains('chat-message') && it.attributes.getNamedItem('data-message-id'));
  }

  static findNodeMatching(current, predicate) {
    if (current) {
      if (predicate(current)) {
        return current;
      }
      return Avd12Utility.findNodeMatching(current.parentElement, predicate);
    }
    return undefined;
  }


  /* -------------------------------------------- */
  static createDirectOptionList(min, max) {
    let options = {};
    for (let i = min; i <= max; i++) {
      options[`${i}`] = `${i}`;
    }
    return options;
  }

  /* -------------------------------------------- */
  static buildListOptions(min, max) {
    let options = ""
    for (let i = min; i <= max; i++) {
      options += `<option value="${i}">${i}</option>`
    }
    return options;
  }

  /* -------------------------------------------- */
  static getTarget() {
    if (game.user.targets) {
      for (let target of game.user.targets) {
        return target
      }
    }
    return undefined
  }

  /* -------------------------------------------- */
  static updateRollData(rollData) {
    let id = rollData.rollId
    let oldRollData = this.rollDataStore[id] || {}
    let newRollData = mergeObject(oldRollData, rollData)
    this.rollDataStore[id] = newRollData
  }
  /* -------------------------------------------- */
  static saveRollData(rollData) {
    game.socket.emit("system.avd12", {
      name: "msg_update_roll", data: rollData
    }); // Notify all other clients of the roll    
    this.updateRollData(rollData)
  }

  /* -------------------------------------------- */
  static getRollData(id) {
    return this.rollDataStore[id]
  }


  
  /* -------------------------------------------- */
  static async onSocketMesssage(msg) {
    if (msg.name == "msg_update_roll") {
      this.updateRollData(msg.data)
    }
    if (msg.name == "msg_gm_process_attack_defense") {
      this.processSuccessResult(msg.data)
    }
    if (msg.name == "msg_gm_item_drop" && game.user.isGM) {
      let actor = game.actors.get(msg.data.actorId)
      let item
      if (msg.data.isPack) {
        item = await fromUuid("Compendium." + msg.data.isPack + "." + msg.data.itemId)
      } else {
        item = game.items.get(msg.data.itemId)
      }
      this.addItemDropToActor(actor, item)
    }
  }

  /* -------------------------------------------- */
  static computeFocusData(focus) {
    let focusData = {
      focusPoints: __focusCore[focus.core] + __focusPointTreatment[focus.treatment],
      burnChance: __burnChanceTreatment[focus.treatment],
      focusRegen: __focusRegenBond[focus.bond],
      spellAttackBonus: __bonusSpellAttackBond[focus.bond],
      spellDamageBonus: __bonusSpellDamageBond[focus.bond]
    }
    return focusData
  }

  /* -------------------------------------------- */
  static async searchItem(dataItem) {
    let item
    if (dataItem.pack) {
      let id = dataItem.id || dataItem._id
      let items = await this.loadCompendium(dataItem.pack, item => item.id == id)
      item = items[0] || undefined
    } else {
      item = game.items.get(dataItem.id)
    }
    return item
  }

  /* -------------------------------------------- */
  static getSpellCost(spell) {
    return parseInt(__spellCost[spell.system.level])
  }

  /* -------------------------------------------- */
  static getArmorPenalty( item ) {
    if(!item)
      return{};

    if(!item.system.equipped){
      return {};
    }

    if (item && (item.type == "shield" || item.type == "armor")) {
      return __armorPenalties[item.system.category]
    }
    return {}
  }

  /* -------------------------------------------- */
  static chatDataSetup(content, modeOverride, isRoll = false, forceWhisper) {
    let chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content: content
    };

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (chatData.rollMode === "blindroll") chatData["blind"] = true;
    else if (chatData.rollMode === "selfroll") chatData["whisper"] = [game.user];

    if (forceWhisper) { // Final force !
      chatData["speaker"] = ChatMessage.getSpeaker();
      chatData["whisper"] = ChatMessage.getWhisperRecipients(forceWhisper);
    }

    return chatData;
  }

  /* -------------------------------------------- */
  static async showDiceSoNice(roll, rollMode) {
    if (game.modules.get("dice-so-nice")?.active) {
      if (game.dice3d) {
        let whisper = null;
        let blind = false;
        rollMode = rollMode ?? game.settings.get("core", "rollMode");
        switch (rollMode) {
          case "blindroll": //GM only
            blind = true;
          case "gmroll": //GM + rolling player
            whisper = this.getUsers(user => user.isGM);
            break;
          case "roll": //everybody
            whisper = this.getUsers(user => user.active);
            break;
          case "selfroll":
            whisper = [game.user.id];
            break;
        }
        await game.dice3d.showForRoll(roll, game.user, true, whisper, blind);
      }
    }
  }

  /* -------------------------------------------- */
  static updateSkill(skill) {
    skill.system.level = skill.system.background + skill.system.basic + skill.system.class + skill.system.explevel
    if (skill.system.level > 7) { skill.system.level = 7 }
    skill.system.skilldice = __skillLevel2Dice[skill.system.level]
  }
  
  static findAtTokens(inputString) {
    let regex = /@\w+/g;
    let result = inputString.match(regex);
    return result || [];
}




  /* -------------------------------------------- */
  static async rollAvd12(rollData) {
    let actor = game.actors.get(rollData.actorId)
    // Build the dice formula
    let diceFormula = "1d12"
    if (rollData.skill)
      diceFormula += "+" + rollData.skill.finalvalue
    if (rollData.crafting) 
      diceFormula += "+" + rollData.crafting.skill
    if (rollData.spellAttack) 
      diceFormula += "+" + rollData.spellAttack;
    if (rollData.skill && rollData.skill.good) 
      diceFormula = "3d4+" + rollData.skill.finalvalue;
    if (rollData.weapon ) 
      diceFormula += "+" + rollData.weapon.attackBonus;
    if(rollData.burn)
      diceFormula = "1d12 -" + rollData.burn.burnValue;
    if(rollData.action){
      switch(rollData.action.type){
        case "action":
          diceFormula = rollData.diceFormula;
          break;
        case "utility":
          diceFormula = rollData.diceFormula;
          break;
        case "damage":
          diceFormula = rollData.diceFormula;
          break;
        case "damage-tertiary":
          diceFormula = rollData.diceFormula;
          break;
        case "damage-secondary":
          diceFormula = rollData.diceFormula;
          break;
        case "check":
          diceFormula = rollData.diceFormula;
          break;
      }
      let parseTokens = Avd12Utility.findAtTokens(diceFormula)
      
      for(let i =0; i < parseTokens.length; i++){
        let val = Avd12Utility.getMappedValue(actor, parseTokens[i])
        if(val == "-1" || isNaN(val)){
            diceFormula = diceFormula.replace(parseTokens[i], "");
        }else{
            diceFormula = diceFormula.replace(parseTokens[i], Number(val));
        }
      }
    }
  
    diceFormula += "+" + rollData.bonusMalusRoll  
    rollData.diceFormula = diceFormula

    // Performs roll
    let myRoll = rollData.roll
    if (!myRoll) { // New rolls only of no rerolls
      myRoll = new Roll(diceFormula).roll({ async: false })
      myRoll.diceData = this.setDiceDisplay(myRoll);
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
    }
    rollData.roll = myRoll
    if (rollData.spell) {
      actor.spentFocusPoints(rollData.spellCost);
    }

    let msg = await this.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/avd12/templates/chat/chat-generic-result.hbs`, rollData)
    })

    msg.setFlag("world", "rolldata", rollData)
    if (rollData.skillKey == "initiative") {
      actor.setFlag("world", "initiative", myRoll.total) 
    }
  }

  static setDiceDisplay(result){
    let str = "";
    for(let i in result.dice){

      let currResult = result.dice[i];

      switch(Number(currResult.faces)){
        case 4:
          for(let j = 0; j < currResult.results.length; j++){
            str += `<li class='roll-d4'>${result.dice[i].results[j].result}</li>`
          }
          break;
        case 6:
          for(let j = 0; j < currResult.results.length; j++){
            str += `<li class='roll-d6'>${result.dice[i].results[j].result}</li>`
          }
          break;  
        case 8:
          for(let j = 0; j < currResult.results.length; j++){
            str += `<li class='roll-d8'>${result.dice[i].results[j].result}</li>`
          }
          break;
        case 10:
          for(let j = 0; j < currResult.results.length; j++){
            str += `<li class='roll-d10'>${result.dice[i].results[j].result}</li>`
          }
        break;
        case 12:
          for(let j = 0; j < currResult.results.length; j++){
            str += `<li class='roll-d12'>${result.dice[i].results[j].result}</li>`
          }
          break;
        case 20:
          for(let j = 0; j < currResult.results.length; j++){
            str += `<li class='roll-d20'>${result.dice[i].results[j].result}</li>`
          }
          break;
      }
    }

    return str;
  }

  static reverseString(str) {
    // Step 1. Use the split() method to return a new array
    var splitString = str.split(""); // var splitString = "hello".split("");
    // ["h", "e", "l", "l", "o"]
 
    // Step 2. Use the reverse() method to reverse the new created array
    var reverseArray = splitString.reverse(); // var reverseArray = ["h", "e", "l", "l", "o"].reverse();
    // ["o", "l", "l", "e", "h"]
 
    // Step 3. Use the join() method to join all elements of the array into a string
    var joinArray = reverseArray.join(""); // var joinArray = ["o", "l", "l", "e", "h"].join("");
    // "olleh"
    
    //Step 4. Return the reversed string
    return joinArray; // "olleh"
}

  /* -------------------------------------------- */
  static sortArrayObjectsByName(myArray) {

    
    myArray.sort((a, b) => {
      let fa = a.name.toLowerCase();
      let fb = b.name.toLowerCase();
      if (fa < fb) {
        return -1;
      }
      if (fa > fb) {
        return 1;
      }
      return 0;
    })
  }

  static getHeavyShieldReaction(){

    let json = `{
      "folder": "JUbRIYO0CIXLz4NV",
      "name": "Reaction : Shields Up! [Heavy]",
      "type": "reaction",
      "img": "icons/svg/item-bag.svg",
      "system": {
          "description": "In response to an Enemy making an Attack Roll against you, lower the Roll by 1d4 after the result of the Attack Roll is known. This also downgrades True Hits to Normal Hits.",
          "traittype": "undefined"
      },
      "effects": [],
      "sort": 0,
      "ownership": {
          "default": 0,
          "PkSjA89Pm9zyORjP": 3
      },
      "flags": {},
      "_stats": {
          "systemId": "avd12",
          "systemVersion": "10.0.25",
          "coreVersion": "10.291",
          "createdTime": 1680974863058,
          "modifiedTime": 1680974895862,
          "lastModifiedBy": "PkSjA89Pm9zyORjP"
      },
      "_id": "3f035231e05a42fa"
  }`

    return JSON.parse(json);


  }
  
  static parse(str) {
    let matches = str.match(/\[(.+)\]\s*(.+)/);
    if (matches) {
      let source = matches[1];
      const current = matches[2].trim();
      const [s3, bucket] = source.split(":");
      if (bucket !== undefined) {
        return {
          activeSource: s3,
          bucket: bucket,
          current: current,
        };
      } else {
        return {
          activeSource: s3,
          bucket: null,
          current: current,
        };
      }
    }
    // failsave, try it at least
    return {
      activeSource: "data",
      bucket: null,
      current: str,
    };
  }

  static async createDirectory(source, target, options = {}) {
    if (!target) {
      throw new Error("No directory name provided");
    }
    return FilePicker.createDirectory(source, target, options);
  }

  static async verifyPath(parsedPath, targetPath = null) {
    try {
      const paths = (targetPath) ? targetPath.split("/") : parsedPath.current.split("/");
      let currentSource = paths[0];

      for (let i = 0; i < paths.length; i += 1) {
        try {
          if (currentSource !== paths[i]) {
            currentSource = `${currentSource}/${paths[i]}`;
          }
          // eslint-disable-next-line no-await-in-loop

          await FilePicker.createDirectory(parsedPath.activeSource, `${currentSource}`, { bucket: parsedPath.bucket });

        } catch (err) {
          if (!err.startsWith("EEXIST") && !err.startsWith("The S3 key")) {
            logger.error(`Error trying to verify path [${parsedPath.activeSource}], ${parsedPath.current}`, err);
            logger.error("parsedPath", parsedPath);
            logger.error("targetPath", targetPath);
          }
        }
      }
    } catch (err) {
      console.log(err);
      return false;
    }
    return true;
  }
  static async uploadToPath(path, file) {
    return FilePicker.upload("data", path, file);
  }

  static async downloadImage(url){
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: "GET",
        headers: {
          "x-requested-with": "foundry"
        },
      })
        .then((response) => {
          if (!response.ok) {
            reject("Could not retrieve image");
          }
          return response.blob();
        })
        .then((blob) => resolve(blob))
        .catch((error) => reject(error.message));
    });
  }
  


  static getLightShieldReaction(){

    let json = `{
      "folder": "JUbRIYO0CIXLz4NV",
      "name": "Reaction : Shields Up! [Light]",
      "type": "reaction",
      "img": "icons/svg/item-bag.svg",
      "system": {
          "description": "After being hit by a Projectile or Weapon Attack that does Physical Damage, reduce the Damage by a number equal to 1d4 plus your Block Modifier.",
          "traittype": "undefined"
      },
      "effects": [],
      "sort": 0,
      "ownership": {
          "default": 0,
          "PkSjA89Pm9zyORjP": 3
      },
      "flags": {},
      "_stats": {
          "systemId": "avd12",
          "systemVersion": "10.0.25",
          "coreVersion": "10.291",
          "createdTime": 1680974863058,
          "modifiedTime": 1680974895862,
          "lastModifiedBy": "PkSjA89Pm9zyORjP"
      },
      "_id": "3f035231e05a42fa"
  }`

    return JSON.parse(json);


  }

  /* -------------------------------------------- */
  static getUsers(filter) {
    return game.users.filter(filter).map(user => user.id);
  }
  /* -------------------------------------------- */
  static getWhisperRecipients(rollMode, name) {
    switch (rollMode) {
      case "blindroll": return this.getUsers(user => user.isGM);
      case "gmroll": return this.getWhisperRecipientsAndGMs(name);
      case "selfroll": return [game.user.id];
    }
    return undefined;
  }
  /* -------------------------------------------- */
  static getWhisperRecipientsAndGMs(name) {
    let recep1 = ChatMessage.getWhisperRecipients(name) || [];
    return recep1.concat(ChatMessage.getWhisperRecipients('GM'));
  }

  /* -------------------------------------------- */
  static blindMessageToGM(chatOptions) {
    let chatGM = duplicate(chatOptions);
    chatGM.whisper = this.getUsers(user => user.isGM);
    chatGM.content = "Blinde message of " + game.user.name + "<br>" + chatOptions.content;
    console.log("blindMessageToGM", chatGM);
    game.socket.emit("system.avd12", { msg: "msg_gm_chat_message", data: chatGM });
  }


  /* -------------------------------------------- */
  static split3Columns(data) {

    let array = [[], [], []];
    if (data == undefined) return array;

    let col = 0;
    for (let key in data) {
      let keyword = data[key];
      keyword.key = key; // Self-reference
      array[col].push(keyword);
      col++;
      if (col == 3) col = 0;
    }
    return array;
  }

  /* -------------------------------------------- */
  static createChatMessage(name, rollMode, chatOptions) {
    switch (rollMode) {
      case "blindroll": // GM only
        if (!game.user.isGM) {
          this.blindMessageToGM(chatOptions);

          chatOptions.whisper = [game.user.id];
          chatOptions.content = "Message only to the GM";
        }
        else {
          chatOptions.whisper = this.getUsers(user => user.isGM);
        }
        break;
      default:
        chatOptions.whisper = this.getWhisperRecipients(rollMode, name);
        break;
    }
    chatOptions.alias = chatOptions.alias || name;
    return ChatMessage.create(chatOptions);
  }

  static async createDamageChatMessage(damageData) {
    return ChatMessage.create({
      name : damageData.actor.name, 
      alias : damageData.actor.name, 
      content : await renderTemplate(`systems/avd12/templates/chat/take-damage-result.hbs`, damageData)
    });
  }

  static async createUseActionChatMessage(actionData) {
    return ChatMessage.create({
      name : actionData.actor.name, 
      alias : actionData.actor.name, 
      content : await renderTemplate(`systems/avd12/templates/chat/chat-use-action.hbs`, actionData)
    });
  }

  static async createRestChatMessage(restData) {
    return ChatMessage.create({
      name : restData.actor.name, 
      alias : restData.actor.name, 
      content : await renderTemplate(`systems/avd12/templates/chat/take-rest.hbs`, restData)
    });
  }

  /* -------------------------------------------- */
  static getBasicRollData() {
    let rollData = {
      rollId: randomID(16),
      bonusMalusRoll: 0,
      targetCheck: "none",
      rollMode: game.settings.get("core", "rollMode")
    }
    Avd12Utility.updateWithTarget(rollData)
    return rollData
  }

  /* -------------------------------------------- */
  static updateWithTarget(rollData) {
    let target = Avd12Utility.getTarget()
    if (target) {
      rollData.defenderTokenId = target.id
    }
  }

  /* -------------------------------------------- */
  static createChatWithRollMode(name, chatOptions) {
    return this.createChatMessage(name, game.settings.get("core", "rollMode"), chatOptions)
   
  }


  static getStanceId(id){

    const idToValue = {
      "1": "NCEq4AOX8Kvncmw2",
      "2": "3TqyZJjHnVIdYf2D",
      "3": "TySBH1U1KHDMKHYh",
      "4": "RJQUTk0E4pzY5mu5",
      "5": "ncPdN83j5FGqpUvJ",
      "6": "e0BA0soylepbF7UW",
      "7": "wDd0r83QzxZfNLfv",
      "8": "qznqKa6tYEjNIeP6",
      "9": "b54615Tqm50544A4",
      "10": "eNLJUSTFRwQXiBul",
      "11": "ezKWJyeRdPeJqSR9",
      "12": "3YhdOrOBbhU5vWxg",
      "13": "UhmPOlbTqhlPrxix",
      "14": "UhmPOlbTqhlPrxix",
      "15": "QXSoaGNidcaKQ6AV",
      "16": "PZ0cRFmbvULKHc8K",
      "17": "pt8B35nAVkEt2kOx",
      "18": "zkqZsHjlpz8kOn6a",
      "19": "KAkQHJGIkMrGeNGX",
      "20": "zWANggNp2aMhJXhY",
      "default": "NCEq4AOX8Kvncmw2"
    };
    return idToValue[id] || idToValue.undefined;
  }

  /* -------------------------------------------- */
  static async confirmDelete(actorSheet, li) {
    let itemId = li.data("item-id");
    let msgTxt = "<p>Are you sure to remove this Item ?";
    let buttons = {
      delete: {
        icon: '<i class="fas fa-check"></i>',
        label: "Yes, remove it",
        callback: () => {
          actorSheet.actor.deleteEmbeddedDocuments("Item", [itemId]);
          li.slideUp(200, () => actorSheet.render(false));
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    }
    msgTxt += "</p>";
    let d = new Dialog({
      title: "Confirm removal",
      content: msgTxt,
      buttons: buttons,
      default: "cancel"
    });
    d.render(true);
  }

}