/* -------------------------------------------- */
import { Avd12Utility } from "./avd12-utility.js";
import { Avd12RollDialog } from "./avd12-roll-dialog.js";


/* -------------------------------------------- */
/* -------------------------------------------- */
/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class Avd12Actor extends Actor {

  /* -------------------------------------------- */
  /**
   * Override the create() function to provide additional SoS functionality.
   *
   * This overrided create() function adds initial items 
   * Namely: Basic skills, money, 
   *
   * @param {Object} data        Barebones actor data which this function adds onto.
   * @param {Object} options     (Unused) Additional options which customize the creation workflow.
   *
   */

  static async create(data, options) {

    // Case of compendium global import
    if (data instanceof Array) {
      return super.create(data, options);
    }
    // If the created actor has items (only applicable to duplicated actors) bypass the new actor creation logic
    if (data.items) {
      let actor = super.create(data, options);
      return actor;
    }

    if (data.type == 'character') {
    }
    if (data.type == 'npc') {
    }

    return super.create(data, options);
  }

  /* -------------------------------------------- */
  prepareBaseData() {
  }

  /* -------------------------------------------- */
  async prepareData() {

    super.prepareData()

  }

  /* -------------------------------------------- */
  computeHitPoints() {
    if (this.type == "character") {
    }
  } 

  /* -------------------------------------------- */
  rebuildSkills() {
    let armorPenalties = Avd12Utility.getArmorPenalty( this.items.find( item => item.type == "armor") )
    let shieldPenalties = Avd12Utility.getArmorPenalty( this.items.find( item => item.type == "shield") )

    for (let attrKey in this.system.attributes) {
      let attr = this.system.attributes[attrKey]
      for (let skillKey in attr.skills) {
        let dataPath = attrKey + ".skills." + skillKey + ".modifier"
        let skill = attr.skills[skillKey]
        skill.modifier = 0
        let availableTraits = this.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
        for (let trait of availableTraits) {
          skill.modifier += Number(trait.system.bonusvalue)
        }
        // Apply armor penalties
        if ( armorPenalties[skillKey]) {
          console.log("Found armor penalties : ", armorPenalties, skillKey)
          skill.modifier += Number(armorPenalties[skillKey])
        }
        // Apply shield penalties
        if ( shieldPenalties[skillKey]) {
          console.log("Found shield penalties : ", shieldPenalties, skillKey)
          skill.modifier += Number(shieldPenalties[skillKey])
        }
        // Process additionnal bonuses
        for(let item of this.items) {
          if (item.system.bonus && item.system.bonus[skillKey]) {
            skill.modifier += Number(item.system.bonus[skillKey].value)
          }
        }
        skill.finalvalue = skill.modifier + attr.value
      }
    }
  }
  
  /* -------------------------------------------- */
  rebuildMitigations() {
    for (let mitiKey in this.system.mitigation) {
      let mitigation = this.system.mitigation[mitiKey]
      for(let item of this.items) {
        if (item.system.mitigation && item.system.mitigation[mitiKey]) {
          mitigation.value += Number(item.system.mitigation[mitiKey].value)
        }
      }
    }
  }

  /* -------------------------------------------- */
  prepareDerivedData() {

    if (this.type == 'character' || game.user.isGM) {
      this.system.encCapacity = this.getEncumbranceCapacity()
      this.buildContainerTree()
      this.computeHitPoints()

      this.rebuildSkills()
      this.rebuildMitigations()
    }

    super.prepareDerivedData();
  }

  /* -------------------------------------------- */
  _preUpdate(changed, options, user) {

    super._preUpdate(changed, options, user);
  }

  /*_onUpdateEmbeddedDocuments( embeddedName, ...args ) {
    this.rebuildSkills()
    super._onUpdateEmbeddedDocuments(embeddedName, ...args)
  }*/
  
  /* -------------------------------------------- */
  getEncumbranceCapacity() {
    return 1;
  }

  /* -------------------------------------------- */
  getMoneys() {
    let comp = this.items.filter(item => item.type == 'money');
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  getEquippedWeapons() {
    let comp = duplicate(this.items.filter(item => item.type == 'weapon' && item.system.equipped) || []);
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  getArmors() {
    let comp = duplicate(this.items.filter(item => item.type == 'armor') || []);
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  getEquippedArmor() {
    let comp = this.items.find(item => item.type == 'armor' && item.system.equipped)
    if (comp) {
      return duplicate(comp)
    }
    return undefined
  }
  getSpells() {
    let comp = duplicate(this.items.filter(item => item.type == 'spell') || []);
    return comp
  }
  /* -------------------------------------------- */
  getShields() {
    let comp = duplicate(this.items.filter(item => item.type == 'shield') || []);
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  getEquippedShield() {
    let comp = this.items.find(item => item.type == 'shield' && item.system.equipped)
    if (comp) {
      return duplicate(comp)
    }
    return undefined
  }
  /* -------------------------------------------- */
  checkAndPrepareEquipment(item) {
  }

  /* -------------------------------------------- */
  checkAndPrepareEquipments(listItem) {
    for (let item of listItem) {
      this.checkAndPrepareEquipment(item)
    }
    return listItem
  }

  /* -------------------------------------------- */
  getConditions() {
    let comp = duplicate(this.items.filter(item => item.type == 'condition') || []);
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  getWeapons() {
    let comp = duplicate(this.items.filter(item => item.type == 'weapon') || []);
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  getItemById(id) {
    let item = this.items.find(item => item.id == id);
    if (item) {
      item = duplicate(item)
    }
    return item;
  }

  /* -------------------------------------------- */
  getModules() {
    let comp = duplicate(this.items.filter(item => item.type == 'module') || [])
    return comp
  }
  getTraits() {
    let comp = duplicate(this.items.filter(item => item.type == 'trait') || [])
    return comp
  }
  /* -------------------------------------------- */
  getRelevantAttribute(attrKey) {
    let comp = duplicate(this.items.filter(item => item.type == 'skill' && item.system.attribute == attrKey) || []);
    return comp;
  }


  /* -------------------------------------------- */
  async equipItem(itemId) {
    let item = this.items.find(item => item.id == itemId)
    if (item && item.system) {
      if (item.type == "armor") {
        let armor = this.items.find(item => item.id != itemId && item.type == "armor" && item.system.equipped)
        if (armor) {
          ui.notifications.warn("You already have an armor equipped!")
          return
        }
      }
      if (item.type == "shield") {
        let shield = this.items.find(item => item.id != itemId && item.type == "shield" && item.system.equipped)
        if (shield) {
          ui.notifications.warn("You already have a shield equipped!")
          return
        }
      }
      let update = { _id: item.id, "system.equipped": !item.system.equipped };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  compareName(a, b) {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  }

  /* ------------------------------------------- */
  getEquipments() {
    return this.items.filter(item => item.type == 'shield' || item.type == 'armor' || item.type == "weapon" || item.type == "equipment");
  }
  /* ------------------------------------------- */
  getEquipmentsOnly() {
    return duplicate(this.items.filter(item => item.type == "equipment") || [])
  }

  /* ------------------------------------------- */
  async addModuleLevel(moduleId, levelChoice) {
    for (let itemId in levelChoice.features) {
      let itemData = duplicate(levelChoice.features[itemId])
      itemData.system.moduleId = moduleId
      itemData.system.originalId = itemId
      //let item = await Item.create(itemData, { temporary: true });
      await this.createEmbeddedDocuments('Item', [itemData])
    }
  }
  /* ------------------------------------------- */
  async deleteModuleLevel(moduleId, levelChoice) {
    let toDelete = []
    for (let itemId in levelChoice.features) {
      let item = this.items.find(it => Avd12Utility.isModuleItemAllowed(it.type) && it.system.moduleId == moduleId && it.system.originalId == itemId)
      if (item) {
        toDelete.push(item.id)
      }
    }
    console.log("toele", toDelete, moduleId, levelChoice)
    if (toDelete.length > 0) {
      await this.deleteEmbeddedDocuments('Item', toDelete)
    }
  }

  /* ------------------------------------------- */
  async buildContainerTree() {
    let equipments = duplicate(this.items.filter(item => item.type == "equipment") || [])
    for (let equip1 of equipments) {
      if (equip1.system.iscontainer) {
        equip1.system.contents = []
        equip1.system.contentsEnc = 0
        for (let equip2 of equipments) {
          if (equip1._id != equip2.id && equip2.system.containerid == equip1.id) {
            equip1.system.contents.push(equip2)
            let q = equip2.system.quantity ?? 1
            equip1.system.contentsEnc += q * equip2.system.weight
          }
        }
      }
    }

    // Compute whole enc
    let enc = 0
    for (let item of equipments) {
      //item.data.idrDice = Avd12Utility.getDiceFromLevel(Number(item.data.idr))
      if (item.system.equipped) {
        if (item.system.iscontainer) {
          enc += item.system.contentsEnc
        } else if (item.system.containerid == "") {
          let q = item.system.quantity ?? 1
          enc += q * item.system.weight
        }
      }
    }
    for (let item of this.items) { // Process items/shields/armors
      if ((item.type == "weapon" || item.type == "shield" || item.type == "armor") && item.system.equipped) {
        let q = item.system.quantity ?? 1
        enc += q * item.system.weight
      }
    }

    // Store local values
    this.encCurrent = enc
    this.containersTree = equipments.filter(item => item.system.containerid == "") // Returns the root of equipements without container

  }

  /* -------------------------------------------- */
  async rollArmor(rollData) {
    let armor = this.getEquippedArmor()
    if (armor) {

    }
    return { armor: "none" }
  }

  /* -------------------------------------------- */
  async incDecHP(formula) {
    let dmgRoll = new Roll(formula).roll({ async: false })
    await Avd12Utility.showDiceSoNice(dmgRoll, game.settings.get("core", "rollMode"))
    let hp = duplicate(this.system.secondary.hp)
    hp.value = Number(hp.value) + Number(dmgRoll.total)
    this.update({ 'system.secondary.hp': hp })
    return Number(dmgRoll.total)
  }

  /* -------------------------------------------- */
  async addObjectToContainer(itemId, containerId) {
    let container = this.items.find(item => item.id == containerId && item.system.iscontainer)
    let object = this.items.find(item => item.id == itemId)
    if (container) {
      if (object.system.iscontainer) {
        ui.notifications.warn("Only 1 level of container allowed")
        return
      }
      let alreadyInside = this.items.filter(item => item.system.containerid && item.system.containerid == containerId);
      if (alreadyInside.length >= container.system.containercapacity) {
        ui.notifications.warn("Container is already full !")
        return
      } else {
        await this.updateEmbeddedDocuments("Item", [{ _id: object.id, 'system.containerid': containerId }])
      }
    } else if (object && object.system.containerid) { // remove from container
      console.log("Removeing: ", object)
      await this.updateEmbeddedDocuments("Item", [{ _id: object.id, 'system.containerid': "" }]);
    }
  }

  /* -------------------------------------------- */
  async preprocessItem(event, item, onDrop = false) {
    //console.log('ITEM', item)
    if ( item.system.focus && item.system.focus?.isfocus) {
      let focusItem = this.items.find(it => it.system.focus?.isfocus)
      if (focusItem) {
        ui.notifications.warn("You already have a Focus Item in your equipment.")
        return false
      }
    }
    let dropID = $(event.target).parents(".item").attr("data-item-id") // Only relevant if container drop
    let objectID = item.id || item._id
    this.addObjectToContainer(objectID, dropID)
    return true
  }

  /* -------------------------------------------- */
  computeFinalFocusData() {
    let focus = this.items.find(it => it.system.focus?.isfocus)
    if (focus) {
      let focusData = Avd12Utility.computeFocusData(focus.system.focus)
      let focusBonus = this.items.filter( it => it.system.focuspointsbonus > 0).reduce((sum, item2) => sum = item2.system.focuspointsbonus, 0)
      let focusregenbonus = this.items.filter( it => it.system.focusregenbonus > 0).reduce((sum, item2) => sum = item2.system.focusregenbonus, 0)
      let burnchancebonus = this.items.filter( it => it.system.burnchancebonus > 0).reduce((sum, item2) => sum = item2.system.burnchancebonus, 0)

      let focusPoints = focusData.focusPoints + focusBonus
      let focusRegen = focusData.focusRegen + focusregenbonus
      //console.log("Update focus", focusPoints, focusRegen)
      if ( focusPoints != this.system.focus.focuspoints || focusRegen != this.system.focus.focusregen) {
        let focusData = duplicate(this.system.focus) 
        focusData.focuspoints = focusPoints
        focusData.focusregen = focusRegen
        this.update( {'system.focus': focusData})
      }
      //console.log("FINAL BONUS", focusBonus, focusregenbonus, burnchancebonus)
      return {
        focusPoints : focusPoints,
        burnChance: focusData.burnChance + burnchancebonus,
        focusRegen: focusRegen,
        spellAttackBonus: focusData.spellAttackBonus,
        spellDamageBonus: focusData.spellDamageBonus,
        currentFocusPoints: this.system.focus.currentfocuspoints
      }
    }
    return {
      focusPoints : 0,
      burnChance: 0,
      focusRegen: 0,
      spellAttackBonus: 0,
      spellDamageBonus: 0
    }
  }

  /* -------------------------------------------- */
  async equipGear(equipmentId) {
    let item = this.items.find(item => item.id == equipmentId);
    if (item && item.system) {
      let update = { _id: item.id, "system.equipped": !item.system.equipped };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }
  /* -------------------------------------------- */
  getInitiativeScore(combatId, combatantId) {
    if (this.type == 'character') {
      this.rollMR(true, combatId, combatantId)
    }
    console.log("Init required !!!!")
    return -1;
  }

  /* -------------------------------------------- */
  getSubActors() {
    let subActors = [];
    for (let id of this.system.subactors) {
      subActors.push(duplicate(game.actors.get(id)))
    }
    return subActors;
  }
  /* -------------------------------------------- */
  async addSubActor(subActorId) {
    let subActors = duplicate(this.system.subactors);
    subActors.push(subActorId);
    await this.update({ 'system.subactors': subActors });
  }
  /* -------------------------------------------- */
  async delSubActor(subActorId) {
    let newArray = [];
    for (let id of this.system.subactors) {
      if (id != subActorId) {
        newArray.push(id);
      }
    }
    await this.update({ 'system.subactors': newArray });
  }

  /* -------------------------------------------- */
  syncRoll(rollData) {
    this.lastRollId = rollData.rollId;
    Avd12Utility.saveRollData(rollData);
  }

  /* -------------------------------------------- */
  getOneSkill(skillId) {
    let skill = this.items.find(item => item.type == 'skill' && item.id == skillId)
    if (skill) {
      skill = duplicate(skill);
    }
    return skill;
  }

  /* -------------------------------------------- */
  async deleteAllItemsByType(itemType) {
    let items = this.items.filter(item => item.type == itemType);
    await this.deleteEmbeddedDocuments('Item', items);
  }

  /* -------------------------------------------- */
  async addItemWithoutDuplicate(newItem) {
    let item = this.items.find(item => item.type == newItem.type && item.name.toLowerCase() == newItem.name.toLowerCase())
    if (!item) {
      await this.createEmbeddedDocuments('Item', [newItem]);
    }
  }

  /* -------------------------------------------- */
  async incrementSkillExp(skillId, inc) {
    let skill = this.items.get(skillId)
    if (skill) {
      await this.updateEmbeddedDocuments('Item', [{ _id: skill.id, 'system.exp': skill.system.exp + inc }])
      let chatData = {
        user: game.user.id,
        rollMode: game.settings.get("core", "rollMode"),
        whisper: [game.user.id].concat(ChatMessage.getWhisperRecipients('GM')),
        content: `<div>${this.name} has gained 1 exp in the skill ${skill.name} (exp = ${skill.system.exp})</div`
      }
      ChatMessage.create(chatData)
      if (skill.system.exp >= 25) {
        await this.updateEmbeddedDocuments('Item', [{ _id: skill.id, 'system.exp': 0, 'system.explevel': skill.system.explevel + 1 }])
        let chatData = {
          user: game.user.id,
          rollMode: game.settings.get("core", "rollMode"),
          whisper: [game.user.id].concat(ChatMessage.getWhisperRecipients('GM')),
          content: `<div>${this.name} has gained 1 exp SL in the skill ${skill.name} (new exp SL :  ${skill.system.explevel}) !</div`
        }
        ChatMessage.create(chatData)
      }
    }
  }

  /* -------------------------------------------- */
  async incDecQuantity(objetId, incDec = 0) {
    let objetQ = this.items.get(objetId)
    if (objetQ) {
      let newQ = objetQ.system.quantity + incDec
      if (newQ >= 0) {
        const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'system.quantity': newQ }]) // pdates one EmbeddedEntity
      }
    }
  }
  /* -------------------------------------------- */
  async incDecAmmo(objetId, incDec = 0) {
    let objetQ = this.items.get(objetId)
    if (objetQ) {
      let newQ = objetQ.system.ammocurrent + incDec;
      if (newQ >= 0 && newQ <= objetQ.system.ammomax) {
        const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'system.ammocurrent': newQ }]); // pdates one EmbeddedEntity
      }
    }
  }

  /* -------------------------------------------- */
  isForcedAdvantage() {
    return this.items.find(cond => cond.type == "condition" && cond.system.advantage)
  }
  isForcedDisadvantage() {
    return this.items.find(cond => cond.type == "condition" && cond.system.disadvantage)
  }
  isForcedRollAdvantage() {
    return this.items.find(cond => cond.type == "condition" && cond.system.rolladvantage)
  }
  isForcedRollDisadvantage() {
    return this.items.find(cond => cond.type == "condition" && cond.system.rolldisadvantage)
  }
  isNoAdvantage() {
    return this.items.find(cond => cond.type == "condition" && cond.system.noadvantage)
  }
  isNoAction() {
    return this.items.find(cond => cond.type == "condition" && cond.system.noaction)
  }
  isAttackDisadvantage() {
    return this.items.find(cond => cond.type == "condition" && cond.system.attackdisadvantage)
  }
  isDefenseDisadvantage() {
    return this.items.find(cond => cond.type == "condition" && cond.system.defensedisadvantage)
  }
  isAttackerAdvantage() {
    return this.items.find(cond => cond.type == "condition" && cond.system.targetadvantage)
  }

  /* -------------------------------------------- */
  getCommonRollData() {

    let rollData = Avd12Utility.getBasicRollData()
    rollData.alias = this.name
    rollData.actorImg = this.img
    rollData.actorId = this.id
    rollData.img = this.img

    console.log("ROLLDATA", rollData)

    return rollData
  }

  /* -------------------------------------------- */
  rollAbility(abilityKey) {
    let rollData = this.getCommonRollData(abilityKey)
    rollData.mode = "ability"
    if (rollData.target) {
      ui.notifications.warn("You are targetting a token with a skill : please use a Weapon instead.")
      return
    }
    Avd12Utility.rollAvd12(rollData)
  }

  /* -------------------------------------------- */
  rollSkill(attrKey, skillKey) {
    let attr = this.system.attributes[attrKey]
    let skill = attr.skills[skillKey]
    if (skill) {
      skill = duplicate(skill)
      skill.name = Avd12Utility.upperFirst(skillKey)
      skill.attr = duplicate(attr)
      let rollData = this.getCommonRollData()
      rollData.mode = "skill"
      rollData.skill = skill
      rollData.title = "Roll Skill " + skill.name
      rollData.img = skill.img
      this.startRoll(rollData)
    }
  }

  /* -------------------------------------------- */
  async rollSpell(spellId) {
    let spell = this.items.get(spellId)
    if (spell) {
      spell = duplicate(spell)
      let rollData = this.getCommonRollData()
      rollData.mode = "spell"
      rollData.spell = spell
      rollData.spellAttack = this.system.bonus.spell.attack
      rollData.spellDamage = this.system.bonus.spell.damage
      rollData.spellCost = Avd12Utility.getSpellCost(spell)
      rollData.title = "Roll Spell " + spell.name
      rollData.img = spell.img
      if (spell.system.spelltype != "utility") {
        this.startRoll(rollData)
      } else {
        this.spentFocusPoints( spell )
        let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
          content: await renderTemplate(`systems/fvtt-avd12/templates/chat/chat-utility-spell.hbs`, rollData)
        })
        msg.setFlag("world", "rolldata", rollData)
      }
    } else {
      ui.notifications.warn("Unable to find the relevant spell.")
    }
  }

  /* -------------------------------------------- */
  spentFocusPoints( spell) {
    let spellCost = Avd12Utility.getSpellCost(spell)
    let focusData = duplicate(this.system.focus)
    focusData.currentfocuspoints -= spellCost
    focusData.currentfocuspoints = Math.max(focusData.currentfocuspoints, 0)
    console.log("New fovcus", this.system, focusData)
    this.update({'system.focus': focusData})
  }

  /* -------------------------------------------- */
  rollWeapon(weaponId) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = duplicate(weapon)
      let skill = this.items.find(item => item.name.toLowerCase() == weapon.system.skill.toLowerCase())
      if (skill) {
        skill = duplicate(skill)
        Avd12Utility.updateSkill(skill)
        let abilityKey = skill.system.ability
        let rollData = this.getCommonRollData(abilityKey)
        rollData.mode = "weapon"
        rollData.skill = skill
        rollData.weapon = weapon
        rollData.img = weapon.img
        if (!rollData.forceDisadvantage) { // This is an attack, check if disadvantaged
          rollData.forceDisadvantage = this.isAttackDisadvantage()
        }
        /*if (rollData.weapon.system.isranged && rollData.tokensDistance > Avd12Utility.getWeaponMaxRange(rollData.weapon) ) {
          ui.notifications.warn(`Your target is out of range of your weapon (max: ${Avd12Utility.getWeaponMaxRange(rollData.weapon)}  - current : ${rollData.tokensDistance})` )
          return
        }*/
        this.startRoll(rollData)
      } else {
        ui.notifications.warn("Unable to find the relevant skill for weapon " + weapon.name)
      }
    }
  }

  /* -------------------------------------------- */
  rollDefenseMelee(attackRollData) {
    let weapon = this.items.get(attackRollData.defenseWeaponId)
    if (weapon) {
      weapon = duplicate(weapon)
      let skill = this.items.find(item => item.name.toLowerCase() == weapon.system.skill.toLowerCase())
      if (skill) {
        skill = duplicate(skill)
        Avd12Utility.updateSkill(skill)
        let abilityKey = skill.system.ability
        let rollData = this.getCommonRollData(abilityKey)
        rollData.defenderTokenId = undefined // Cleanup
        rollData.mode = "weapondefense"
        rollData.shield = this.getEquippedShield()
        rollData.attackRollData = duplicate(attackRollData)
        rollData.skill = skill
        rollData.weapon = weapon
        rollData.img = weapon.img
        if (!rollData.forceDisadvantage) { // This is an attack, check if disadvantaged
          rollData.forceDisadvantage = this.isDefenseDisadvantage()
        }

        this.startRoll(rollData)
      } else {
        ui.notifications.warn("Unable to find the relevant skill for weapon " + weapon.name)
      }
    } else {
      ui.notifications.warn("Weapon not found ! ")
    }
  }

  /* -------------------------------------------- */
  rollDefenseRanged(attackRollData) {
    let rollData = this.getCommonRollData()
    rollData.defenderTokenId = undefined // Cleanup
    rollData.mode = "rangeddefense"
    if (attackRollData) {
      rollData.attackRollData = duplicate(attackRollData)
      rollData.effectiveRange = Avd12Utility.getWeaponRange(attackRollData.weapon)
      rollData.tokensDistance = attackRollData.tokensDistance // QoL copy
    }
    rollData.sizeDice = Avd12Utility.getSizeDice(this.system.biodata.size)
    rollData.distanceBonusDice = 0 //Math.max(0, Math.floor((rollData.tokensDistance - rollData.effectiveRange) + 0.5))
    rollData.hasCover = "none"
    rollData.situational = "none"
    rollData.useshield = false
    rollData.shield = this.getEquippedShield()
    this.startRoll(rollData)
  }

  /* -------------------------------------------- */
  rollShieldDie() {
    let shield = this.getEquippedShield()
    if (shield) {
      shield = duplicate(shield)
      let rollData = this.getCommonRollData()
      rollData.mode = "shield"
      rollData.shield = shield
      rollData.useshield = true
      rollData.img = shield.img
      this.startRoll(rollData)
    }
  }

  /* -------------------------------------------- */
  async rollArmorDie(rollData = undefined) {
    let armor = this.getEquippedArmor()
    if (armor) {
      armor = duplicate(armor)
      let reduce = 0
      let multiply = 1
      let disadvantage = false
      let advantage = false
      let messages = ["Armor applied"]

      if (rollData) {
        if (Avd12Utility.isArmorLight(armor) && Avd12Utility.isWeaponPenetrating(rollData.attackRollData.weapon)) {
          return { armorIgnored: true, nbSuccess: 0, messages: ["Armor ignored : Penetrating weapons ignore Light Armors."] }
        }
        if (Avd12Utility.isWeaponPenetrating(rollData.attackRollData.weapon)) {
          messages.push("Armor reduced by 1 (Penetrating weapon)")
          reduce = 1
        }
        if (Avd12Utility.isWeaponLight(rollData.attackRollData.weapon)) {
          messages.push("Armor with advantage (Light weapon)")
          advantage = true
        }
        if (Avd12Utility.isWeaponHeavy(rollData.attackRollData.weapon)) {
          messages.push("Armor with disadvantage (Heavy weapon)")
          disadvantage = true
        }
        if (Avd12Utility.isWeaponHack(rollData.attackRollData.weapon)) {
          messages.push("Armor reduced by 1 (Hack weapon)")
          reduce = 1
        }
        if (Avd12Utility.isWeaponUndamaging(rollData.attackRollData.weapon)) {
          messages.push("Armor multiplied by 2 (Undamaging weapon)")
          multiply = 2
        }
      }
      let diceColor = armor.system.absorprionroll
      let armorResult = await Avd12Utility.getRollTableFromDiceColor(diceColor, false)
      console.log("Armor log", armorResult)
      let armorValue = Math.max(0, (Number(armorResult.text) + reduce) * multiply)
      if (advantage || disadvantage) {
        let armorResult2 = await Avd12Utility.getRollTableFromDiceColor(diceColor, false)
        let armorValue2 = Math.max(0, (Number(armorResult2.text) + reduce) * multiply)
        if (advantage) {
          armorValue = (armorValue2 > armorValue) ? armorValue2 : armorValue
          messages.push(`Armor advantage - Roll 1 = ${armorValue} - Roll 2 = ${armorValue2}`)
        }
        if (disadvantage) {
          armorValue = (armorValue2 < armorValue) ? armorValue2 : armorValue
          messages.push(`Armor disadvantage - Roll 1 = ${armorValue} - Roll 2 = ${armorValue2}`)
        }
      }
      armorResult.armorValue = armorValue
      if (!rollData) {
        ChatMessage.create({ content: "Armor result : " + armorValue })
      }
      messages.push("Armor result : " + armorValue)
      return { armorIgnored: false, nbSuccess: armorValue, rawArmor: armorResult.text, messages: messages }
    }
    return { armorIgnored: true, nbSuccess: 0, messages: ["No armor equipped."] }
  }

  /* -------------------------------------------- */
  async startRoll(rollData) {
    this.syncRoll(rollData)
    let rollDialog = await Avd12RollDialog.create(this, rollData)
    rollDialog.render(true)
  }

}
