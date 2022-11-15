/* -------------------------------------------- */
import { Avd12Combat } from "./avd12-combat.js";
import { Avd12Commands } from "./avd12-commands.js";


/* -------------------------------------------- */
export class Avd12Utility {


  /* -------------------------------------------- */
  static async init() {
    Hooks.on('renderChatLog', (log, html, data) => Avd12Utility.chatListeners(html));
    /*Hooks.on("dropCanvasData", (canvas, data) => {
      Avd12Utility.dropItemOnToken(canvas, data)
    });*/

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
  static buildBonusList() {
    let bonusList = []
    for(let key in game.system.model.Actor.character.bonus)  {
      let bonuses = game.system.model.Actor.character.bonus[key]
      for (let bonus in bonuses) {
        bonusList.push( key + "." + bonus )
      }
    }
    for(let key in game.system.model.Actor.character.attributes)  {
      let attrs = game.system.model.Actor.character.attributes[key]
      for(let skillKey in attrs.skills)  {
        bonusList.push( key + ".skills." + skillKey + ".modifier" )
      }
    }
    for(let key in game.system.model.Actor.character.universal.skills)  {
      bonusList.push( "universal.skills." + key + ".modifier" )
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
      'systems/fvtt-avd12/templates/items/partial-options-weapon-types.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-weapon-categories.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-attributes.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-equipment-types.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-spell-types.hbs',
      'systems/fvtt-avd12/templates/items/partial-options-spell-levels.hbs',
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
      if (rollData.attackRollData.weapon.system.isranged ) {
        return { result: "miss", fumble: true, hpLossType: "melee" }
      } else {
        return { result: "miss", fumble: true, attackerHPLoss: "2d3", hpLossType: "melee" }
      }
    }
    if (rollData.sumSuccess == -2) {
      if (rollData.attackRollData.weapon.system.isranged ) {
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
      console.log("Results processed", rollData)
    }
  }

  /* -------------------------------------------- */
  static async processAttackDefense(rollData) {
    if (rollData.attackRollData) {
      //console.log("Defender token, ", rollData, rollData.defenderTokenId)
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
    console.log("SOCKET MESSAGE", msg.name)
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

    // ability/save/size => 0
    let diceFormula
    let startFormula = "0d6cs>=5"
    if (rollData.ability) {
      startFormula = String(rollData.ability.value) + "d6cs>=5"
    }
    if (rollData.save) {
      startFormula = String(rollData.save.value) + "d6cs>=5"
    }
    if (rollData.sizeDice) {
      let nb = rollData.sizeDice.nb + rollData.distanceBonusDice + this.getDiceFromCover(rollData.hasCover) + this.getDiceFromSituational(rollData.situational)       
      startFormula = String(nb) + String(rollData.sizeDice.dice) + "cs>=5"
    }
    diceFormula = startFormula

    // skill => 2
    // feat => 4
    // bonus => 6
    if (rollData.skill) {
      let level = rollData.skill.system.level
      if (rollData.skill.system.issl2) {
        rollData.hasSLBonus = true
        level += 2
        if (level > 7) { level = 7 }
      }
      rollData.skill.system.skilldice = __skillLevel2Dice[level]
      diceFormula += "+" + String(rollData.skill.system.skilldice) + "cs>=5"

      if (rollData.skill.system.skilltype == "complex" && rollData.skill.system.level == 0) {
        rollData.complexSkillDisadvantage = true
        rollData.rollAdvantage = "roll-disadvantage"
      }

      if (rollData.skill.system.isfeatdie) {
        rollData.hasFeatDie = true
        diceFormula += "+ 1d10cs>=5"
      } else {
        diceFormula += `+ 0d10cs>=5`
      }
      if (rollData.skill.system.bonusdice != "none") {
        rollData.hasBonusDice = rollData.skill.system.bonusdice
        diceFormula += `+ ${rollData.hasBonusDice}cs>=5`
      } else {
        diceFormula += `+ 0d6cs>=5`
      }
    } else {
      diceFormula += `+ 0d8cs=>5 + 0d10cs>=5 + 0d6cs>=5`
    }

    // advantage => 8
    let advFormula = "+ 0d8cs>=5"
    if (rollData.advantage == "advantage1" || rollData.forceAdvantage) {
      advFormula = "+ 1d8cs>=5"
    }
    if (rollData.advantage == "advantage2") {
      advFormula = "+ 2d8cs>=5"
    }
    diceFormula += advFormula

    // disadvantage => 10
    let disFormula = "- 0d8cs>=5"
    if (rollData.disadvantage == "disadvantage1" || rollData.forceDisadvantage) {
      disFormula = "- 1d8cs>=5"
    }
    if (rollData.disadvantage == "disadvantage2") {
      disFormula = "- 2d8cs>=5"
    }
    diceFormula += disFormula

    // armor => 12
    let skillArmorPenalty = 0
    for (let armor of rollData.armors) {
      if (armor.system.equipped) {
        skillArmorPenalty += armor.system.skillpenalty
      }
    }
    if (rollData.skill && rollData.skill.system.armorpenalty && skillArmorPenalty > 0) {
      rollData.skillArmorPenalty = skillArmorPenalty
      diceFormula += `- ${skillArmorPenalty}d8cs>=5`
    } else {
      diceFormula += `- 0d8cs>=5`
    }

    // shield => 14
    if (rollData.useshield && rollData.shield) {
      diceFormula += "+ 1" + String(rollData.shield.system.shielddie) + "cs>=5"
    } else {
      diceFormula += " + 0d6cs>=5"
    }

    // Performs roll
    console.log("Roll formula", diceFormula)
    let myRoll = rollData.roll
    if (!myRoll) { // New rolls only of no rerolls
      myRoll = new Roll(diceFormula).roll({ async: false })
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
    }
    rollData.rollOrder = 0
    rollData.roll = myRoll
    rollData.nbSuccess = myRoll.total

    if (rollData.rollAdvantage == "none" && rollData.forceRollAdvantage) {
      rollData.rollAdvantage = "roll-advantage"
    }
    if (rollData.rollAdvantage == "none" && rollData.forceRollDisadvantage) {
      rollData.rollAdvantage = "roll-disadvantage"
    }
    if (rollData.rollAdvantage != "none") {

      rollData.rollOrder = 1
      rollData.rollType = (rollData.rollAdvantage == "roll-advantage") ? "Advantage" : "Disadvantage"
      this.createChatWithRollMode(rollData.alias, {
        content: await renderTemplate(`systems/fvtt-avd12/templates/chat-generic-result.html`, rollData)
      })

      rollData.rollOrder = 2
      let myRoll2 = new Roll(diceFormula).roll({ async: false })
      await this.showDiceSoNice(myRoll2, game.settings.get("core", "rollMode"))

      rollData.roll = myRoll2 // Tmp switch to display the proper results
      rollData.nbSuccess = myRoll2.total
      this.createChatWithRollMode(rollData.alias, {
        content: await renderTemplate(`systems/fvtt-avd12/templates/chat-generic-result.html`, rollData)
      })
      rollData.roll = myRoll // Revert the tmp switch
      rollData.nbSuccess = myRoll.total

      if (rollData.rollAdvantage == "roll-advantage") {
        if (myRoll2.total > rollData.nbSuccess) {
          hasChanged = true
          rollData.roll = myRoll2
          rollData.nbSuccess = myRoll2.total
        }
      } else {
        if (myRoll2.total < rollData.nbSuccess) {
          rollData.roll = myRoll2
          rollData.nbSuccess = myRoll2.total
        }
      }
      rollData.rollOrder = 3
    }
    rollData.nbSuccess = Math.max(0, rollData.nbSuccess)

    rollData.isFirstRollAdvantage = false
    // Manage exp
    if (rollData.skill && rollData.skill.system.level > 0) {
      let nbSkillSuccess = rollData.roll.terms[2].total
      if (nbSkillSuccess == 0 || nbSkillSuccess == rollData.skill.system.level) {
        actor.incrementSkillExp(rollData.skill.id, 1)
      }
    }

    this.saveRollData(rollData)
    actor.lastRoll = rollData

    this.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/fvtt-avd12/templates/chat-generic-result.html`, rollData)
    })
    console.log("Rolldata result", rollData)

    // Message response
    this.displayDefenseMessage(rollData)

    // Manage defense result
    this.processAttackDefense(rollData)
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
  static async searchItem(dataItem) {
    let item
    if (dataItem.pack) {
      item = await fromUuid("Compendium." + dataItem.pack + "." + dataItem.id)
    } else {
      item = game.items.get(dataItem.id)
    }
    return item
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
    ChatMessage.create(chatOptions);
  }

  /* -------------------------------------------- */
  static getBasicRollData() {
    let rollData = {
      rollId: randomID(16),
      rollMode: game.settings.get("core", "rollMode"),
      advantage: "none"
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
    this.createChatMessage(name, game.settings.get("core", "rollMode"), chatOptions)
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