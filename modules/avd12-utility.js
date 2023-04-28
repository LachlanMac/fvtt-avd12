/* -------------------------------------------- */
import { Avd12Combat } from "./avd12-combat.js";
import { Avd12Commands } from "./avd12-commands.js";

/* -------------------------------------------- */
const __ALLOWED_MODULE_TYPES = { "action": 1, "reaction": 1, "freeaction": 1, "trait": 1 }
const __focusCore = { "corenone": 0, "core1gp": 6, "core5gp": 8, "core50gp": 10, "core100gp": 12, "core300gp": 16, "core500gp": 20, "core800gp": 26, "core1000gp": 32 }
const __burnChanceTreatment = { "treatmentnone": 0, "treatment1gp": 8, "treatment4gp": 7, "treatment20gp": 6, "treatment50gp": 5, "treatment500gp": 4, "treatment1000gp": 3, "treatment5000gp": 2, "treatment10000gp": 1 }
const __focusPointTreatment = { "treatmentnone": 0, "treatment1gp": 0, "treatment4gp": 1, "treatment20gp": 2, "treatment50gp": 4, "treatment500gp": 6, "treatment1000gp": 8, "treatment5000gp": 14, "treatment10000gp": 20 }
const __focusRegenBond = { "bondnone": 6, "bondeasy": 8, "bondcommon": 12, "bonduncommon": 16, "bondrare": 22, "bondlegendary": 26, "bondmythic": 36, "bonddivine": 48 }
const __bonusSpellDamageBond = { "bondnone": 0, "bondeasy": 1, "bondcommon": 1, "bonduncommon": 1, "bondrare": 2, "bondlegendary": 2, "bondmythic": 3, "bonddivine": 4 }
const __bonusSpellAttackBond = { "bondnone": 0, "bondeasy": 0, "bondcommon": 1, "bonduncommon": 1, "bondrare": 2, "bondlegendary": 2, "bondmythic": 3, "bonddivine": 4 }
const __spellCost = { "beginner": 1, "novice": 2, "expert": 4, "master": 6, "grandmaster": 8 }
const __armorPenalties = {"light": { block: -2, dodge: -1}, 
    "medium": { dodge: -3, block: -2, castingtime: 1, stealth: -2, speed: -1}, 
    "heavy": { dodge: -4, block: -3, stealth: -3, castingtime: 2, speed: -3 },
     "ultraheavy": { dodge: -5, block: -4, stealth: -5, castingtime: 2, speed: -3 }, 
    "lightshield": {dodge: -1, block: +1}, 
    "heavyshield": {dodge: -2, block: 2, speed: -1, stealth: -1} }


/* -------------------------------------------- */
export class Avd12Utility {


  /* -------------------------------------------- */
  static async init() {
    Hooks.on('renderChatLog', (log, html, data) => Avd12Utility.chatListeners(html));
    /*Hooks.on("dropCanvasData", (canvas, data) => {
      Avd12Utility.dropItemOnToken(canvas, data)
    });*/

    //system.healthEstimate.core.custom.FractionHP
    console.log(game.healthEstimate);
    console.log("SYSTEM::",);
    await Avd12Utility.verifyPath(Avd12Utility.parse("avd12/characters/"));

    this.rollDataStore = {}
    this.defenderStore = {}

    Avd12Commands.init();

    Handlebars.registerHelper('count', function (list) {
      return list.length;
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
    return bonusList
  }

  /* -------------------------------------------- */
  static async ready() {
    const skills = await Avd12Utility.loadCompendium("fvtt-avd12.skills")
    this.skills = skills.map(i => i.toObject())
    this.weaponSkills = duplicate(this.skills.filter(item => item.system.isweaponskill))
    this.shieldSkills = duplicate(this.skills.filter(item => item.system.isshieldskill))

    const rollTables = await Avd12Utility.loadCompendium("fvtt-avd12.rolltables")
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

  }

  /* -------------------------------------------- */
  static async preloadHandlebarsTemplates() {

    const templatePaths = [
      'systems/fvtt-avd12/templates/actors/editor-notes-gm.hbs',
      'systems/fvtt-avd12/templates/items/partial-item-nav.hbs',
      'systems/fvtt-avd12/templates/items/partial-item-description.hbs',
      'systems/fvtt-avd12/templates/items/partial-common-item-fields.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-damage-types.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-weapon-types.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-weapon-categories.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-attributes.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-equipment-types.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-armor-types.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-spell-types.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-spell-levels.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-spell-schools.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-focus-bond.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-focus-treatment.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-focus-core.hbs',
    ]
    return loadTemplates(templatePaths);
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
    game.socket.emit("system.fvtt-avd12", {
      name: "msg_update_roll", data: rollData
    }); // Notify all other clients of the roll    
    this.updateRollData(rollData)
  }

  /* -------------------------------------------- */
  static getRollData(id) {
    return this.rollDataStore[id]
  }

  /* -------------------------------------------- */
  static async displayDefenseMessage(rollData) {
    if (rollData.mode == "weapon" && rollData.defenderTokenId) {
      let defender = game.canvas.tokens.get(rollData.defenderTokenId).actor
      if (game.user.isGM || (game.user.character && game.user.character.id == defender.id)) {
        rollData.defender = defender
        rollData.defenderWeapons = defender.getEquippedWeapons()
        rollData.isRangedAttack = rollData.weapon?.system.isranged
        this.createChatWithRollMode(defender.name, {
          name: defender.name,
          alias: defender.name,
          //user: defender.id,
          content: await renderTemplate(`systems/fvtt-avd12/templates/chat-request-defense.html`, rollData),
          whisper: [defender.id].concat(ChatMessage.getWhisperRecipients('GM')),
        })
      }
    }
  }

  /* -------------------------------------------- */
  static getSuccessResult(rollData) {
    if (rollData.sumSuccess <= -3) {
      if (rollData.attackRollData.weapon.system.isranged) {
        return { result: "miss", fumble: true, hpLossType: "melee" }
      } else {
        return { result: "miss", fumble: true, attackerHPLoss: "2d3", hpLossType: "melee" }
      }
    }
    if (rollData.sumSuccess == -2) {
      if (rollData.attackRollData.weapon.system.isranged) {
        return { result: "miss", dangerous_fumble: true }
      } else {
        return { result: "miss", dangerous_fumble: true, attackerHPLoss: "1d3", hpLossType: "melee" }
      }
    }
    if (rollData.sumSuccess == -1) {
      return { result: "miss" }
    }
    if (rollData.sumSuccess == 0) {
      if (rollData.attackRollData.weapon.system.isranged) {
        return { result: "target_space", aoe: true }
      } else {
        return { result: "clash", hack_vs_shields: true }
      }
    }
    if (rollData.sumSuccess == 1) {
      return { result: "hit", defenderDamage: "1", entangle: true, knockback: true }
    }
    if (rollData.sumSuccess == 2) {
      return { result: "hit", defenderDamage: "2", critical_1: true, entangle: true, knockback: true, penetrating_impale: true, hack_armors: true }
    }
    if (rollData.sumSuccess >= 3) {
      return { result: "hit", defenderDamage: "3", critical_2: true, entangle: true, knockback: true, penetrating_impale: true, hack_armors: true }
    }
  }

  /* -------------------------------------------- */
  static async getFumble(weapon) {
    const pack = game.packs.get("fvtt-avd12.rolltables")
    const index = await pack.getIndex()
    let entry

    if (weapon.isranged) {
      entry = index.find(e => e.name === "Fumble! (ranged)")
    }
    if (!weapon.isranged) {
      entry = index.find(e => e.name === "Fumble! (melee)")
    }
    let table = await pack.getDocument(entry._id)
    const draw = await table.draw({ displayChat: false, rollMode: "gmroll" })
    return draw.results.length > 0 ? draw.results[0] : undefined
  }

  /* -------------------------------------------- */
  static async processSuccessResult(rollData) {
    if (game.user.isGM) { // Only GM process this
      let result = rollData.successDetails
      let attacker = game.actors.get(rollData.actorId)
      let defender = game.canvas.tokens.get(rollData.attackRollData.defenderTokenId).actor

      if (attacker && result.attackerHPLoss) {
        result.attackerHPLossValue = await attacker.incDecHP("-" + result.attackerHPLoss)
      }
      if (attacker && defender && result.defenderDamage) {
        let dmgDice = (rollData.attackRollData.weapon.system.isranged) ? "d6" : "d8"
        result.damageWeaponFormula = result.defenderDamage + dmgDice
        result.defenderHPLossValue = await defender.incDecHP("-" + result.damageWeaponFormula)
      }
      if (result.fumble || (result.dangerous_fumble && Avd12Utility.isWeaponDangerous(rollData.attackRollData.weapon))) {
        result.fumbleDetails = await this.getFumble(rollData.weapon)
      }
      if (result.critical_1 || result.critical_2) {
        let isDeadly = Avd12Utility.isWeaponDeadly(rollData.attackRollData.weapon)
        result.critical = await this.getCritical((result.critical_1) ? "I" : "II", rollData.attackRollData.weapon)
        result.criticalText = result.critical.text
      }
      this.createChatWithRollMode(rollData.alias, {
        content: await renderTemplate(`systems/fvtt-avd12/templates/chat-attack-defense-result.html`, rollData)
      })
    }
  }

  /* -------------------------------------------- */
  static async processAttackDefense(rollData) {
    if (rollData.attackRollData) {
      let defender = game.canvas.tokens.get(rollData.attackRollData.defenderTokenId).actor
      let sumSuccess = rollData.attackRollData.nbSuccess - rollData.nbSuccess
      if (sumSuccess > 0) {
        let armorResult = await defender.rollArmorDie(rollData)
        rollData.armorResult = armorResult
        sumSuccess += rollData.armorResult.nbSuccess
        if (sumSuccess < 0) { // Never below 0
          sumSuccess = 0
        }
      }
      rollData.sumSuccess = sumSuccess
      rollData.successDetails = this.getSuccessResult(rollData)
      if (game.user.isGM) {
        this.processSuccessResult(rollData)
      } else {
        game.socket.emit("system.fvtt-avd12", { msg: "msg_gm_process_attack_defense", data: rollData });
      }
    }
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
    return __spellCost[spell.system.level]
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

  /* -------------------------------------------- */
  static getDiceFromCover(cover) {
    if (cover == "cover50") return 1
    return 0
  }
  /* -------------------------------------------- */
  static getDiceFromSituational(cover) {
    if (cover == "prone") return 1
    if (cover == "dodge") return 1
    if (cover == "moving") return 1
    if (cover == "engaged") return 1
    return 0
  }

  /* -------------------------------------------- */
  static async rollAvd12(rollData) {

    let actor = game.actors.get(rollData.actorId)

  
    // Build the dice formula
    let diceFormula = "1d12"
    if (rollData.skill) {
      diceFormula += "+" + rollData.skill.finalvalue
    }
    if (rollData.crafting) {
      diceFormula += "+" + rollData.crafting.system.level
    }
    if (rollData.spellAttack) {
      diceFormula += "+" + rollData.spellAttack
    }
    diceFormula += "+" + rollData.bonusMalusRoll
    if (rollData.skill && rollData.skill.good) {
      diceFormula = "3d4+" + rollData.skill.finalvalue;
    }
    if (rollData.weapon ) {
      diceFormula += "+" + rollData.weapon.attackBonus
    }
    if(rollData.burn){
      diceFormula = "1d12 -" + rollData.burn.burnValue;
    }
    rollData.diceFormula = diceFormula

    // Performs roll
    let myRoll = rollData.roll
    if (!myRoll) { // New rolls only of no rerolls
      myRoll = new Roll(diceFormula).roll({ async: false })
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
    }
    rollData.roll = myRoll

    rollData.isSuccess = false
    if (rollData.targetCheck != "none") {
      if (myRoll.total >= Number(rollData.targetCheck)) {
        rollData.isSuccess = true
      }
    }

    if (rollData.spell) {
      actor.spentFocusPoints(rollData.spell)
    }

    let msg = await this.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/fvtt-avd12/templates/chat/chat-generic-result.hbs`, rollData)
    })


    msg.setFlag("world", "rolldata", rollData)
    if (rollData.skillKey == "initiative") {
      actor.setFlag("world", "initiative", myRoll.total) 
    }

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
          "systemId": "fvtt-avd12",
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
          "systemId": "fvtt-avd12",
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
    game.socket.emit("system.fvtt-avd12", { msg: "msg_gm_chat_message", data: chatGM });
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

  static async displayDefenseMessage(rollData) {
    if (rollData.mode == "weapon" && rollData.defenderTokenId) {
      let defender = game.canvas.tokens.get(rollData.defenderTokenId).actor
      if (game.user.isGM || (game.user.character && game.user.character.id == defender.id)) {
        rollData.defender = defender
        rollData.defenderWeapons = defender.getEquippedWeapons()
        rollData.isRangedAttack = rollData.weapon?.system.isranged
        this.createChatWithRollMode(defender.name, {
          name: defender.name,
          alias: defender.name,
          //user: defender.id,
          content: await renderTemplate(`systems/fvtt-avd12/templates/chat-request-defense.html`, rollData),
        })
      }
    }
  }

  static async createDamageChatMessage(damageData) {
    return ChatMessage.create({
      name : damageData.actor.name, 
      alias : damageData.actor.name, 
      content : await renderTemplate(`systems/fvtt-avd12/templates/chat/take-damage-result.hbs`, damageData)
    });
  }

  static async createRestChatMessage(restData) {
    return ChatMessage.create({
      name : restData.actor.name, 
      alias : restData.actor.name, 
      content : await renderTemplate(`systems/fvtt-avd12/templates/chat/take-rest.hbs`, restData)
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