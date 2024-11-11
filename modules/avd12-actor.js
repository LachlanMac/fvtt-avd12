/* -------------------------------------------- */
import { prepareWeapon, prepareThrowingAmmunition } from "./character/avd12-equipment.js";
import { Avd12Utility } from "./avd12-utility.js";
import { Avd12RollDialog } from "./dialog/avd12-roll-dialog.js";
import { Avd12DamageDialog } from "./dialog/avd12-damage-dialog.js";
import { Avd12HealthDialog } from "./dialog/avd12-health-dialog.js";
import {createCharacter, confirmCreateCharacter} from "./character/avd12-create-character.js"
import { Avd12WeaponDamageDialog } from "./dialog/avd12-weapon-damage-dialog.js";
import {importCharacter} from "./character/avd12-character-importer.js"
import {parseStances, addStance, changeStance} from "./character/avd12-stances.js"
import {rebuildNPCSkills} from "./npc/avd12-npc.js"
import {parseActiveEffects, getBestLightSource} from "./character/avd12-effects.js"
import {getMinimumModulePoints, updateModulePoints, getTotalModulePoints, getSpentModulePoints, updateModuleSelection, rebuildModules} from  "./character/avd12-modules.js"
import {useAction} from  "./character/avd12-actions.js"
import {changeBallad} from  "./character/avd12-ballads.js"
/* -------------------------------------------- */
/* -------------------------------------------- */
/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class Avd12Actor extends Actor {
  /* -------------------------------------------- */
  /**
   * @param {Object} data        Barebones actor data which this function adds onto.
   * @param {Object} options     (Unused) Additional options which customize the creation workflow.
   */
  static async create(data, options) {
    if (data instanceof Array) {
      return super.create(data, options);
    }

    if (data.items) {
      let actor = super.create(data, options);
      return actor;
    }

    let actor = await super.create(data, options)
    if (data.type == 'character') {

    }
    else if (data.type == 'npc') {
    }else if(data.type == 'expedition'){

    }
    return actor;
  }

  async prepareData() {
    if (!game.user.isGM && !this.isOwner) {
      return;
    }
    super.prepareData()
  }
  
  prepareDerivedData(){
    if (!game.user.isGM && !this.isOwner) {
      return;
    }
    super.prepareDerivedData();
    if(this.type == 'npc'){
      //this.clearData()
      let items = this.items.filter(item => item.type == "weapon" || item.type == "armor");
      items.forEach(item =>{if(item.type == "armor"){}else if(item.type == "weapon"){}});
      this.rebuildNPCSkills()
      this.parseActiveEffects()
    }else if (this.type == 'character' ) { 
      this.tmpFreeActions = [];
      this.tmpActions = [];
      this.tmpReactions = [];
      this.tmpBallads = [];
      this.tmpStances = [{custom_id:"1_neutral_stance"}];
      console.log("1", this.name, this.system.attributes.might.skills.block.finalvalue);
      this.tmpLanguages = [];
      this.tmpTraits = [];
      this.tmpImmunities = [];

      if (!this.system.created) {
        return;
      }

      this.system.movement.walk.value = 6;
      this.system.health.max = 0;
      this.clearData()
      this.rebuildSkills()
      this.rebuildSize()
      this.updateModulePoints(0);
      console.log("2", this.name, this.system.attributes.might.skills.block.finalvalue);
      this.system.health.max += (this.system.level.value * 5 + 10);
      this.system.focus.focuspoints = 0;
      this.system.focus.focusregen = 0;
      this.system.focus.castpenalty = 0;
      
      this.rebuildModules();
      console.log("3", this.name, this.system.attributes.might.skills.block.finalvalue);
      this.rebuildEquipment();
      console.log("4", this.name, this.system.attributes.might.skills.block.finalvalue);
      this.parseStances();
      this.parseActiveEffects();
      this.rebuildBonuses();
    }else if (this.type == "expedition"){ 
    }  
  }

  clearData(){
    for (let mitiKey in this.system.mitigation) {
      let mitigation = this.system.mitigation[mitiKey]
      mitigation.value = 0
    }
  }

  async syncAllItems() {
    if (!game.user.isGM && !this.isOwner) {
      return;
    }
    let actor = this;
    const combinedAbilities = [...actor.tmpActions, ...actor.tmpFreeActions, ...actor.tmpReactions];
    const itemSets = [
        { items: combinedAbilities, packName: "avd12.abilities", key: 'combinedAbilities' },
        { items: actor.tmpLanguages, packName: "avd12.languages", key: 'tmpLanguages' },
        { items: actor.tmpStances, packName: "avd12.stances", key: 'tmpStances' },
        { items: actor.tmpImmunities, packName: "avd12.immunities", key: 'tmpImmunities' }
    ];
    const allItemsToAdd = [];
    const autoItems = actor.items.filter(item => item.system.auto_added == true);
    if (autoItems.length > 0) {
        const autoItemIds = autoItems.map(item => item.id);
        await actor.deleteEmbeddedDocuments("Item", autoItemIds);
    } 

    for (const { items, packName, key } of itemSets) {
        const pack = game.packs.get(packName);
        if (!pack) {
            console.error(`Missing pack for ${key}:`, packName);
            continue;
        }

        let compendiumItems = [];
        try {
            compendiumItems = await pack.getDocuments();
        } catch (error) {
            console.error(`Failed to load documents from pack: ${packName}`, error);
            continue;
        }
        const filteredItems = compendiumItems.filter(item => {
            const itemInSet = items.some(comparedItem => comparedItem.custom_id === item.system.avd12_id);
            const notInActorInventory = !actor.items.some(i => i.system.avd12_id === item.system.avd12_id);
            return itemInSet && notInActorInventory;
        });
        actor[key] = items.filter(tmpItem => 
            !filteredItems.some(addedItem => addedItem.system.avd12_id === tmpItem.custom_id)
        );
        allItemsToAdd.push(...filteredItems);
    }

    if (allItemsToAdd.length > 0) {
        const itemData = allItemsToAdd.map(item => {
            const itemObj = item.toObject();
            itemObj.system.auto_added = true;
            return itemObj;
        });
        try {
            await actor.createEmbeddedDocuments("Item", itemData);
        } catch (error) {
            console.error("Failed to create embedded documents:", error);
        }
    }
}

  rebuildNPCSkills() {
    rebuildNPCSkills(this);
  }

  //######## STANCES ###########
  async addStance(stance){
    addStance(this,stance)
  }

  async changeStance(stanceId){
    changeStance(this, stanceId);
  }

  async changeBallad(balladId){
    changeBallad(this, balladId)
  }

  parseStances(){
    parseStances(this)
  }
  //######## END STANCES ###########

  //######### EFFECTS #############
  async parseActiveEffects(){
    parseActiveEffects(this)
  
  }
  
  getBestLightSource(){
    getBestLightSource(this);
  }
  //######### END EFFECTS #############

  //################### CHARACTER CREATION #######################
  async confirmCreateCharacter(data){
    await confirmCreateCharacter(this, data);
    await this.syncAllItems();
  }

  createCharacter(){
    createCharacter(this);
  }

  //################ END CHARACTER CREATION ######################

  confirmHealth(dd){
      switch(dd.recoveryType){
        case "health":
          this.system.health.value = Math.min(this.system.health.max, (Number(dd.amount) + this.system.health.value))
          this.update({ 'system.health.value': this.system.health.value})
          break;
        case "temporary_health":
          if(Number(dd.amount) > this.system.health.tmpvalue){
            this.system.health.tmpvalue = Number(dd.amount);
            this.update({ 'system.health.tmpvalue': this.system.health.tmpvalue})
          }
          break;
        case "power":
          this.system.focus.currentfocuspoints = Math.min(this.system.focus.focuspoints, (Number(dd.amount) + this.system.focus.currentfocuspoints))
          this.update({ 'system.focus.currentfocuspoints': this.system.focus.currentfocuspoints})
          break;
      }
  }

  /* -------------------------------------------- */
  confirmDamage(dd){
    let damageData = foundry.utils.duplicate(dd);
    damageData.mitigation = this.system.mitigation[damageData.damageType.toLowerCase()].value

    if(damageData.damageType == "Poison"){
      damageData.mitigation = Number(this.system.attributes.willpower.skills.resilience.finalvalue);
    }

    damageData.mitigated = Number(damageData.mitigation) + Number(damageData.damageModifier);
    damageData.adjusted = Math.max(0,damageData.totalDamage - damageData.mitigated);
    if(damageData.mitigated >= 15){
      damageData.description = "Greatly Reduced"  
    }else if(damageData.mitigated > 8){
      damageData.description = "Reduced"  
    }else if(damageData.mitigated > 2){
      damageData.description = "Slightly Reduced";
    }else if(damageData.mitigated == 0){
      damageData.description = "";
    }else{
      damageData.description = "";
    }
    if(damageData.adjusted <= 0){
      damageData.description = "No";
    }

    let damageToDo = damageData.adjusted;
    //the damage we have to do is greater than the total temp health we have
    if(damageToDo > this.system.health.tmpvalue){
      damageToDo -= this.system.health.tmpvalue;
      this.system.health.tmpvalue = 0;
      this.system.health.value = Math.max(0, this.system.health.value - damageToDo);
    }else{ //the damage is all absorbed
      this.system.health.tmpvalue -= damageToDo;
    }

    damageData.lifeline = false;

    if(this.system.health.value == 0){
      damageData.lifeline = true;
    }
  
    this.update({ 'system.health.tmpvalue': this.system.health.tmpvalue})
    this.update({ 'system.health.value': this.system.health.value})

    damageData.actor = this;
    Avd12Utility.createDamageChatMessage(damageData);
   // msg.setFlag("world", "rolldata", damageData)
  }

  async displaySpellCard(spell, options){
    const token = this.token;
    const templateData = {
      actor: spell.actor,
      tokenId: token?.uuid || null,
      spell: spell,
      data: await spell.actor.system,
      labels: spell.actor.labels,
      name : spell.actor.name, 
      alias:spell.actor.name
    };
    const html = await renderTemplate("systems/avd12/templates/chat/chat-use-spell.hbs", templateData);
    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: ChatMessage.getSpeaker({actor: this, token}),
      flags: {"core.canPopout": true}
    };
    Hooks.callAll("avd12.preDisplayCard", this, chatData, options);
    ChatMessage.applyRollMode(chatData, options.rollMode ?? game.settings.get("core", "rollMode"));
    const card = (options.createMessage !== false) ? await ChatMessage.create(chatData) : chatData;
    Hooks.callAll("avd12.displayCard", this, card);
  }

  useSpell(spellId){ 
    let spell = null;
    if(this.type == "npc"){
      spell = this.items.get(spellId);
    }else if(this.type == "character"){
      spell =  this.getSpell(spellId);   
    }
    if(spell){
      let spellClone = foundry.utils.duplicate(spell);
      spellClone.actor = this;
      this.displaySpellCard(spellClone, {});
    }else{
      console.logAVD12("No Spell Found");
    }
  }

  parseFocus(focus){
    let focusData = Avd12Utility.computeFocusData(focus.system.focus);
    this.system.focus.burn_chance = focusData.burnChance;
    this.system.focus.focuspoints += focusData.focusPoints;
    this.system.focus.focusregen += focusData.focusRegen;
    this.system.bonus.spell.attack += focusData.spellAttackBonus;
    this.system.bonus.spell.damage += focusData.spellDamageBonus;
  }

  hasFocusEquipped(){
    let allEquippedItems = this.items.filter(item => item.system.equipped && item.system.focus.isfocus);
    if(allEquippedItems.length > 0)
      return true;
    return false;
  }

  getSpellShotFocus(){
    let equippedWeapons = this.items.filter(item => (item.system.category == "lightranged" ||item.system.category == "heavyranged" || item.system.category == "ulightranged" ) && item.type == "weapon" && item.system.equipped && item.system.focus.isfocus)
    return equippedWeapons[0] || null;

  }

  getSpellFistFocus(){
    let equippedWeapons = this.items.filter(item => (item.system.category == "unarmed" || item.type == "gloves") && item.system.equipped && item.system.focus.isfocus)
    return equippedWeapons[0] || null;
  }

  parseItemBonuses(item){
    this.system.health.bonus += item.system.bonus.health;
    this.system.movement.walk.value += item.system.bonus.movespeed;
    this.system.bonus.spell.attack += item.system.bonus.spellattack;
    this.system.bonus.spell.damage += item.system.bonus.spelldamage;
    this.system.focus.focuspoints += item.system.bonus.power;
    this.system.focus.focusregen += item.system.bonus.powerregen;
    this.system.focus.burn_chance += item.system.bonus.burnchance;
    this.system.attributes.willpower.skills.resistance.finalvalue += item.system.bonus.resistance.value;
    this.system.attributes.might.skills.block.finalvalue += item.system.bonus.block.value;
    this.system.attributes.agility.skills.dodge.finalvalue += item.system.bonus.dodge.value;
  }

  parseItemMitigations(item){
    const mitigations = ["physical", "arcane", "cold", "fire", "lightning", "psychic", "divine", "dark"];
    mitigations.forEach(type => {
        this.system.mitigation[type].value += item.system.mitigation[type].value || 0;
    });
  }
  
  parseItemSkills(skills, craft, weapon){
    if(weapon){
      let weapon_array = weapon.split(",");
      for(let i in weapon_array){
        weapon_array[i] = Number(weapon_array[i]);
      }

      this.system.bonus.blunt.damage += weapon_array[0];
      this.system.bonus.slash.damage += weapon_array[1];
      this.system.bonus.pierce.damage += weapon_array[2];
      this.system.bonus.ranged.damage += weapon_array[3];
      this.system.bonus.unarmed.damage += weapon_array[4];

      this.system.bonus.blunt.attack += weapon_array[5];
      this.system.bonus.slash.attack += weapon_array[6];
      this.system.bonus.pierce.attack += weapon_array[7];
      this.system.bonus.ranged.attack +=  weapon_array[8];
      this.system.bonus.unarmed.attack += weapon_array[9];
      if(weapon_array[10] > 0){
        weapon_array[10] == "1" ? this.system.bonus.blunt.crits = 1 :  this.system.bonus.blunt.brutals = 1
      } 
      if(weapon_array[11] > 0){
        weapon_array[11] == "1" ? this.system.bonus.slash.crits = 1 :  this.system.bonus.slash.brutals = 1
      } 
      if(weapon_array[12] > 0){
        weapon_array[12] == "1" ? this.system.bonus.pierce.crits = 1 :  this.system.bonus.pierce.brutals = 1
      } 
      if(weapon_array[13] > 0){
        weapon_array[13] == "1" ? this.system.bonus.ranged.crits = 1 :  this.system.bonus.ranged.brutals = 1
      } 
      if(weapon_array[14] > 0){
        weapon_array[14] == "1" ? this.system.bonus.unarmed.crits = 1 :  this.system.bonus.unarmed.brutals = 1
      } 
    }

    if(craft){
      let craft_array = craft.split(",");
      for(let i in craft_array){
        craft_array[i] = Number(craft_array[i]);
      }
      this.system.bonus.craft.ammocraft += craft_array[0];
      this.system.bonus.craft.alchemy += craft_array[1];
      this.system.bonus.craft.smithing += craft_array[2];
      this.system.bonus.craft.cooking += craft_array[3];
      this.system.bonus.craft.scribing += craft_array[4];
      this.system.bonus.craft.runecarving += craft_array[5];
      this.system.bonus.craft.engineering += craft_array[6];
    }
    if(skills){
      let skills_array = skills.split(",");
      for(let i in skills_array){
        skills_array[i] = Number(skills_array[i]);
      }
      this.system.attributes.knowledge.skills.academic.finalvalue += skills_array[0];
      this.system.attributes.agility.skills.acrobatics.finalvalue += skills_array[1];
      this.system.attributes.social.skills.animals.finalvalue += skills_array[2];
      this.system.attributes.knowledge.skills.arcanum.finalvalue += skills_array[3];
      this.system.attributes.might.skills.athletics.finalvalue += skills_array[4];
      this.system.attributes.willpower.skills.concentration.finalvalue += skills_array[5];
      this.system.attributes.willpower.skills.resilience.finalvalue += skills_array[6];
      this.system.universal.skills.initiative.finalvalue += skills_array[7];
      this.system.attributes.social.skills.insight.finalvalue += skills_array[8];
      this.system.attributes.knowledge.skills.medicine.finalvalue += skills_array[9];
      this.system.attributes.social.skills.performance.finalvalue += skills_array[10];
      this.system.attributes.social.skills.persuasion.finalvalue += skills_array[11];
      this.system.universal.skills.search.finalvalue += skills_array[12];
      this.system.attributes.agility.skills.stealth.finalvalue += skills_array[13];
      this.system.attributes.might.skills.strength.finalvalue += skills_array[14];
      this.system.attributes.knowledge.skills.thievery.finalvalue += skills_array[15];
      this.system.attributes.knowledge.skills.wilderness.finalvalue += skills_array[16];
    }
  }

  rebuildEquipment(){
    let allEquippedItems = this.items.filter(item => item.system.equipped)
    allEquippedItems.forEach(item => {
      
      this.parseItemSkills(item.system.skills, item.system.craft_skills, item.system.weapon_skills)
      this.parseItemBonuses(item);
      this.parseItemMitigations(item);
      if(item.system.focus.isfocus){
        this.parseFocus(item);
      }
    })
   
    let equippedWeapons = this.items.filter(item => item.type == "weapon" && item.system.equipped)
    equippedWeapons.forEach(weapon => {
      switch(weapon.system.category){
        case "light1h":
          break;
        case "light2h":
          break;
        case "heavy1h":
          this.system.attributes.agility.skills.dodge.finalvalue -= 1;
          break;
        case "heavy2h":
          this.system.attributes.agility.skills.dodge.finalvalue -= 2;
          break;
        case "lightranged":
          this.system.attributes.might.skills.block.finalvalue -= 1;
          break;
        case "heavyranged":
          this.system.attributes.agility.skills.dodge.finalvalue -= 2;
          this.system.attributes.might.skills.block.finalvalue -= 2;
          break;
        case "uheavyranged":
          this.system.attributes.agility.skills.dodge.finalvalue -= 3;
          this.system.attributes.might.skills.block.finalvalue -= 3;
          break;
      }
    })
   
    let equippedArmor = this.items.find(item => item.type == "armor" && item.system.equipped)
    if(equippedArmor){
      switch(equippedArmor.system.category){
        case "unarmored":
          this.system.mitigation.physical.value += (0 + this.system.bonus.when.unarmored.physical);
          this.system.mitigation.fire.value += (0 + this.system.bonus.when.unarmored.elemental);
          this.system.mitigation.cold.value += (0 + this.system.bonus.when.unarmored.elemental);
          this.system.mitigation.lightning.value += (0 + this.system.bonus.when.unarmored.elemental);
          this.system.attributes.might.skills.block.finalvalue += this.system.bonus.when.unarmored.block;
          this.system.attributes.agility.skills.dodge.finalvalue += this.system.bonus.when.unarmored.dodge;
          this.system.attributes.willpower.skills.resistance.finalvalue += this.system.bonus.when.unarmored.resist; 
          this.system.movement.walk.value += this.system.bonus.when.unarmored.move;
          this.system.bonus.weapon.attack += this.system.bonus.when.unarmored.attack;

          break;
        case "light":
          //do light penalties
          this.system.mitigation.physical.value += (1 + this.system.bonus.when.light_armor.physical);
          this.system.mitigation.fire.value += (2 + this.system.bonus.when.light_armor.elemental);
          this.system.mitigation.cold.value += (2 + this.system.bonus.when.light_armor.elemental);
          this.system.mitigation.lightning.value += (2 + this.system.bonus.when.light_armor.elemental);
          
          this.system.attributes.might.skills.block.finalvalue += this.system.bonus.when.light_armor.block;
          this.system.attributes.agility.skills.dodge.finalvalue += this.system.bonus.when.light_armor.dodge;
          this.system.attributes.willpower.skills.resistance.finalvalue += this.system.bonus.when.light_armor.resist; 
          this.system.movement.walk.value += this.system.bonus.when.light_armor.move;
          this.system.bonus.weapon.attack += this.system.bonus.when.light_armor.attack;

          //apply penalties
          if(this.system.bonus.when.light_armor.remove_penalties == 0){
            this.system.attributes.might.skills.block.finalvalue -= 1;
            this.system.attributes.agility.skills.dodge.finalvalue -= 1;
          }

          break;
        case "medium":
          //do medijm
          this.system.mitigation.physical.value += (2 + this.system.bonus.when.armored.physical);
          this.system.mitigation.fire.value += (1 + this.system.bonus.when.armored.elemental);
          this.system.mitigation.cold.value += (1 + this.system.bonus.when.armored.elemental);
          this.system.mitigation.lightning.value += (1 + this.system.bonus.when.armored.elemental);

          this.system.attributes.might.skills.block.finalvalue += this.system.bonus.when.armored.block;
          this.system.attributes.agility.skills.dodge.finalvalue += this.system.bonus.when.armored.dodge;
          this.system.attributes.willpower.skills.resistance.finalvalue += this.system.bonus.when.armored.resist; 
          this.system.movement.walk.value += this.system.bonus.when.armored.move;
          this.system.bonus.weapon.attack += this.system.bonus.when.armored.attack;

            //apply penalties
          if(this.system.bonus.when.armored.remove_penalties == 0){
            this.system.attributes.might.skills.block.finalvalue -= 2;
            this.system.attributes.agility.skills.dodge.finalvalue -= 3;
            this.system.attributes.agility.skills.acrobatics.finalvalue -= 1;
            this.system.attributes.agility.skills.stealth.finalvalue -= 2;
            this.system.movement.walk.value -= 1;
          }

          this.system.focus.castpenalty = Math.max(0, (1 + this.system.bonus.when.armored.castpenalty)) 

          if(this.system.bonus.when.armored.remove_penalties == 0 && this.system.bonus.when.armored.remove_stealth_penalty == 1){
            this.system.attributes.agility.skills.stealth.finalvalue += 2;
          }

          break;
        case "heavy":

          this.system.mitigation.physical.value += (4 + this.system.bonus.when.armored.physical);
          this.system.mitigation.fire.value += (0 + this.system.bonus.when.armored.elemental);
          this.system.mitigation.cold.value += (0 + this.system.bonus.when.armored.elemental);
          this.system.mitigation.lightning.value += (0 + this.system.bonus.when.armored.elemental);

          this.system.attributes.might.skills.block.finalvalue += this.system.bonus.when.armored.block;
          this.system.attributes.agility.skills.dodge.finalvalue += this.system.bonus.when.armored.dodge;
          this.system.attributes.willpower.skills.resistance.finalvalue += this.system.bonus.when.armored.resist; 
          this.system.movement.walk.value += this.system.bonus.when.armored.move;
          this.system.bonus.weapon.attack += this.system.bonus.when.armored.attack;

          this.system.focus.castpenalty = Math.max(0, (2 + this.system.bonus.when.armored.castpenalty)) 
            //apply penalties
          if(this.system.bonus.when.armored.remove_penalties == 0){
            this.system.attributes.might.skills.block.finalvalue -= 3;
            this.system.attributes.agility.skills.dodge.finalvalue -= 4;
            this.system.attributes.agility.skills.acrobatics.finalvalue -= 3;
            this.system.attributes.agility.skills.stealth.finalvalue -= 3;
            this.system.movement.walk.value -= 2;
          } 

          if(this.system.bonus.when.armored.remove_penalties == 0 && this.system.bonus.when.armored.remove_stealth_penalty == 1){
            this.system.attributes.agility.skills.stealth.finalvalue += 3;
          }

          break;
        case "ultraheavy":
          this.system.mitigation.physical.value += (6 + this.system.bonus.when.armored.physical);
          this.system.mitigation.fire.value += (0 + this.system.bonus.when.armored.elemental);
          this.system.mitigation.cold.value += (0 + this.system.bonus.when.armored.elemental);
          this.system.mitigation.lightning.value += (0 + this.system.bonus.when.armored.elemental);

          this.system.attributes.might.skills.block.finalvalue += this.system.bonus.when.armored.block;
          this.system.attributes.agility.skills.dodge.finalvalue += this.system.bonus.when.armored.dodge;
          this.system.attributes.willpower.skills.resistance.finalvalue += this.system.bonus.when.armored.resist; 
          
          this.system.movement.walk.value += this.system.bonus.when.armored.move;
          this.system.bonus.weapon.attack += this.system.bonus.when.armored.attack;

          this.system.focus.castpenalty = Math.max(0, (3 + this.system.bonus.when.armored.castpenalty)) 

            //apply penalties
          if(this.system.bonus.when.armored.remove_penalties == 0){
            this.system.attributes.might.skills.block.finalvalue -= 4;
            this.system.attributes.agility.skills.dodge.finalvalue -= 5;
            this.system.attributes.agility.skills.acrobatics.finalvalue -= 5;
            this.system.attributes.agility.skills.stealth.finalvalue -= 5;
            this.system.movement.walk.value -= 3;
          }

          if(this.system.bonus.when.armored.remove_penalties == 0 && this.system.bonus.when.armored.remove_stealth_penalty == 1){
            this.system.attributes.agility.skills.stealth.finalvalue += 5;
          }

          break;
      }
  }else{ //unarmored

    this.system.mitigation.physical.value += (0 + this.system.bonus.when.unarmored.physical);
    this.system.mitigation.fire.value += (0 + this.system.bonus.when.unarmored.elemental);
    this.system.mitigation.cold.value += (0 + this.system.bonus.when.unarmored.elemental);
    this.system.mitigation.lightning.value += (0 + this.system.bonus.when.unarmored.elemental);
    this.system.attributes.might.skills.block.finalvalue += this.system.bonus.when.unarmored.block;
    this.system.attributes.agility.skills.dodge.finalvalue += this.system.bonus.when.unarmored.dodge;
    this.system.attributes.willpower.skills.resistance.finalvalue += this.system.bonus.when.unarmored.resist; 
    this.system.movement.walk.value += this.system.bonus.when.unarmored.move;
    this.system.bonus.weapon.attack += this.system.bonus.when.unarmored.attack;

  }
  console.log("5", this.name, this.system.attributes.might.skills.block.finalvalue);
  let equippedShield = this.items.find(item => item.type == "shield" && item.system.equipped)
    if(equippedShield){
      switch(equippedShield.system.category){
        case "lightshield":
          this.system.attributes.might.skills.block.finalvalue += (1 + this.system.bonus.when.shield.block);
          if(this.system.bonus.when.shield.remove_penalties == 0){

          }
          this.tmpTraits.push(Avd12Utility.getLightShieldTrait());
          break;
        case "heavyshield":
          this.system.attributes.might.skills.block.finalvalue += (1 + this.system.bonus.when.shield.block);
          if(this.system.bonus.when.shield.remove_penalties == 0){
            this.system.attributes.agility.skills.dodge.finalvalue -= 2;
            this.system.attributes.agility.skills.stealth.finalvalue -= 1;
            this.system.movement.walk.value -= 1;
          }
          this.tmpTraits.push(Avd12Utility.getHeavyShieldTrait());
          break;

      }
    } 
  }

  /* -------------------------------------------- */
  rebuildSkills() {
   
    for (let attrKey in this.system.attributes) {
      let attr = this.system.attributes[attrKey]
      for (let skillKey in attr.skills) {
        let skill = attr.skills[skillKey]
        skill.modifier = 0
        skill.finalvalue = skill.modifier + attr.value
      }
    }
  }

  rebuildBonuses(){
    this.system.bonus.blunt.damage += this.system.bonus.weapon.damage;
    this.system.bonus.slash.damage += this.system.bonus.weapon.damage;
    this.system.bonus.pierce.damage += this.system.bonus.weapon.damage;
    this.system.bonus.ranged.damage += this.system.bonus.weapon.damage;
    this.system.bonus.unarmed.damage += this.system.bonus.weapon.damage;
    this.system.bonus.blunt.attack += this.system.bonus.weapon.attack;
    this.system.bonus.slash.attack += this.system.bonus.weapon.attack;
    this.system.bonus.pierce.attack += this.system.bonus.weapon.attack;
    this.system.bonus.ranged.attack += this.system.bonus.weapon.attack;
    this.system.bonus.unarmed.attack += this.system.bonus.weapon.attack;
    this.system.health.max += this.system.health.bonus;
    this.system.movement.speed = this.system.movement.walk.value;

    

    if(this.system.bonus.traits.armsman){
      let highest = Math.max(this.system.bonus.blunt.attack, this.system.bonus.slash.attack, this.system.bonus.pierce.attack, this.system.bonus.ranged.attack);
      this.system.bonus.blunt.attack = highest;
      this.system.bonus.slash.attack = highest;
      this.system.bonus.pierce.attack = highest;
      this.system.bonus.ranged.attack = highest;
    }

    if(this.system.bonus.traits.scrapper){
      this.system.bonus.unarmed.attack = Math.max(this.system.bonus.blunt.attack, this.system.bonus.slash.attack, this.system.bonus.pierce.attack, this.system.bonus.unarmed.attack);
    }

    if(this.system.bonus.traits.effective_blows){
      this.system.bonus.unarmed.damage = Math.max(this.system.bonus.unarmed.damage, this.system.attributes.might.skills.strength.finalvalue);
    }

    this.system.bonus.weapon.damage = 0;
    this.system.bonus.weapon.attack = 0;
    this.system.health.bonus = 0;
  }
  
  rebuildSize(){
    switch(Number(this.system.biodata.size)){
      case 2://small
        this.system.attributes.agility.skills.dodge.finalvalue += 1;
        this.system.attributes.agility.skills.stealth.finalvalue += 1;
        this.system.attributes.might.skills.strength.finalvalue -= 1;
        this.system.movement.walk.value -= 1;
        break;
      case 3://medium
        break;
      case 4://large
        this.system.attributes.agility.skills.dodge.finalvalue -= 1;
        this.system.attributes.agility.skills.stealth.finalvalue -= 1;
        this.system.attributes.agility.skills.acrobatics.finalvalue -= 1;
        this.system.attributes.might.skills.strength.finalvalue += 1;
        this.system.attributes.might.skills.block.finalvalue += 1;
        break;
    }
  }


  useAction(actionId){ 
    useAction(this,actionId);
  }

  updateActionUsages(id, value, max ){
    updateActionUsages(this,id,value,max);
  }

  findActionUsages(id){
    return findActionUsages(this,id);
  }

  addActionUsage(id, value, maxValue){
    addActionUsage(this,id,value,maxValue);
  }

  /* -------------------------------------------- */
  async rebuildModules() {
    rebuildModules(this);
  }



  /* -------------------------------------------- */
  _preUpdate(changed, options, user) {
    super._preUpdate(changed, options, user);
  }

  
  _onUpdateEmbeddedDocuments( embeddedName, ...args ) {
    super._onUpdateEmbeddedDocuments(embeddedName, ...args)
  }
  

  /* -------------------------------------------- */
  getMoneys() {
    let comp = this.items.filter(item => item.type == 'money');
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getThrowingEquipment(){
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'equipment' && item.system.quantity > 0 && (item.system.throwtype == "throwable" || item.system.throwtype == "throwing_ammo")) || [])
    let equippedWeapons = [];
    comp.forEach(item => {
      let preparedWeapon = this.prepareThrowingAmmunition(item);
      if(preparedWeapon){
        equippedWeapons.push(preparedWeapon);
      }
    })
    Avd12Utility.sortArrayObjectsByName(equippedWeapons);
    return equippedWeapons;
  }

  getEquippedThrowingWeapons(){
    let comp = this.items.filter(item => item.type == 'weapon' && item.system.equipped);
    let equippedWeapons = [];
    comp.forEach(item => {
      if((item.system.category == "heavy1h" && this.system.bonus.traits.chucker) || item.system.category == "light1h"){
        item.thrown = true;
        let preparedWeapon = this.prepareWeapon(item);
        if(preparedWeapon){
          equippedWeapons.push(preparedWeapon);
        }
      } 
    })
    Avd12Utility.sortArrayObjectsByName(equippedWeapons);
    return equippedWeapons;
  }

  getEquippedWeapons() {
    let comp = this.items.filter(item => item.type == 'weapon' && item.system.equipped);
    let equippedWeapons = [];
    comp.forEach(item => {
      let preparedWeapon = this.prepareWeapon(item);
      if(preparedWeapon){
        equippedWeapons.push(preparedWeapon);
      }
    })
    Avd12Utility.sortArrayObjectsByName(equippedWeapons);
    return equippedWeapons;
  }


  /* -------------------------------------------- */
  getWeapons() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'weapon' || item.type == 'equipable') || [])
    comp.forEach(item => {
      this.prepareWeapon(item)
    })
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }


  getEquippedLightSources(){
    let lightsources = this.items.filter(item => item.system?.light?.lightsource && item.system.equipped)
    return foundry.utils.duplicate(lightsources);
  }

  getLightSources(){
    let lightsources = this.items.filter(item => item.system?.light?.lightsource && item.type == "equipment")
    return foundry.utils.duplicate(lightsources);
  }
  getHeadwear() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'headwear') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getGloves() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'gloves') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getBoots() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'boots') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getCloaks() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'cloak') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getRings() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'ring') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  /* -------------------------------------------- */
  getArmors() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'armor') || []);
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getEquippedArmor() {
    let comp = this.items.find(item => item.type == 'armor' && item.system.equipped)
    if (comp) {
      return foundry.utils.duplicate(comp)
    }
    return undefined
  }

  getAmmunition(){
    return foundry.utils.duplicate(this.items.filter(item => item.type == 'equipment' && item.system.quantity > 0 && item.system.throwtype != ""));
  }


  getSpells(){
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'spell') || []);
    comp.forEach(spell => {
      if(spell.system.damagetype == "none"){
        spell.system.damagetype = "";
      }
      if(this.system.bonus.traits.spellshot && this.isSpellShotSpell(spell)){
          let focus = this.getSpellShotFocus();
          if(focus){
            spell.system.range = this.getSpellShotRange();
          }
      }
      if(this.system.bonus.traits.spellfist == 1 && this.isSpellFistSpell(spell) && this.getSpellFistFocus()){
          spell.system.range = 0;
          spell.system.range_type = "adjacent";
          spell.system.spelltype = "melee attack";
      }     
      spell.system.areaTypeDescription = spell.system.area_type == "" ? "" : spell.system.area_type;
      spell.system.rangeDescription = (spell.system.range > 0 ? spell.system.range : "") + " " + spell.system.range_type.charAt(0).toUpperCase() + spell.system.range_type.substring(1, spell.system.range_type.length);
      spell.system.actionDescription = spell.system.actions + " " + spell.system.action_type.charAt(0).toUpperCase() + spell.system.action_type.slice(1) + (spell.system.actions > 1 ? 's' :'');
      spell.system.improvedDescription = spell.system.description  + (spell.system.chargeeffect ? "\nCharge Effect: " + spell.system.chargeeffect:"")  + (spell.system.components ? "\nComponents: " + spell.system.components : "");  
      spell.system.damageDescription = spell.system.damage + " " + spell.system.damagetype.charAt(0).toUpperCase() + spell.system.damagetype.slice(1)
      if(spell.system.damageDescription.trim()==""){
        spell.system.damageDescription = null;
      }
    })
    return comp
  }

  getBeginnerSpells(spells) {
    let comp = foundry.utils.duplicate(spells.filter(item => item.system.level == 'beginner') || []);
    return comp
  }

  getNoviceSpells(spells) {
    let comp = foundry.utils.duplicate(spells.filter(item => item.system.level == 'novice') || []);
    return comp
  }

  getJourneymanSpells(spells) {
    let comp = foundry.utils.duplicate(spells.filter(item => item.system.level == 'journeyman') || []);
    return comp
  }

  getExpertSpells(spells) {
    let comp = foundry.utils.duplicate(spells.filter(item => item.system.level == 'expert') || []);
    return comp
  }

  getMasterSpells(spells) {
    let comp = foundry.utils.duplicate(spells.filter(item => item.system.level == 'master') || []);
    return comp
  }

  getGrandmasterSpells(spells) {
    let comp = foundry.utils.duplicate(spells.filter(item => item.system.level == 'grand master') || []);
    return comp
  }

  /* -------------------------------------------- */
  getShields() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'shield') || []);
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  getEquippedShield() {
    let comp = this.items.find(item => item.type == 'shield' && item.system.equipped)
    if (comp) {
      return foundry.utils.duplicate(comp)
    }
    return undefined
  }

  /* -------------------------------------------- */
  getConditions() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'condition') || []);
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  addPrimaryDamage(damage, bonusDamage, dice, extraDamage) {
    if (damage.damagetype != "none" && damage.dice) {
      let fullBonus = Number(bonusDamage) + Number(damage.bonus)
      damage.dice = dice;
      damage.normal = damage.dice + '+' + fullBonus + (extraDamage == "" ? "" : extraDamage);
      damage.critical = damage.dice + '+' + Number(fullBonus) * 2 + (extraDamage == "" ? "" : extraDamage);
      let parser = damage.dice.match(/(\d+)(d\d+)/)
      let nbDice = 2
      if (parser && parser[1]) {
        nbDice = Number(parser[1]) * 2
      }
      damage.brutal = nbDice + parser[2] + "+" + (Number(fullBonus) * 2) + (extraDamage == "" ? "" : extraDamage);
    }
  }

  addPrimaryThrownDamage(damage, bonusDamage, dice) {
    if (damage.damagetype != "none" && damage.dice) {
      let fullBonus = Number(bonusDamage) + Number(damage.bonus)
      damage.thrown = dice + '+' + fullBonus;
      let parser = damage.dice.match(/(\d+)(d\d+)/)
      let nbDice = 2
      if (parser && parser[1]) {
        nbDice = Number(parser[1]) * 2
      }
    }
  }

  addOtherDamage(damage, bonusDamage) {
    if (damage.damagetype != "none" && damage.dice) {
      let fullBonus = Number(bonusDamage) + Number(damage.bonus)
      damage.normal = damage.dice + '+' + fullBonus
      let parser = damage.dice.match(/(\d+)(d\d+)/)
      let nbDice = 2
      if (parser && parser[1]) {
        nbDice = Number(parser[1]) * 2
      }
    }
  }

  prepareThrowingAmmunition(ammo){
    return prepareThrowingAmmunition(this,ammo);
  }

  prepareWeapon(weapon) {
    return prepareWeapon(this,weapon);
  }

  getItemById(id) {
    let item = this.items.find(item => item.id == id);
    if (item) {
      item = foundry.utils.duplicate(item)
    }
    return item;
  }

  getStances(){
    return foundry.utils.duplicate(this.items.filter(item => item.type == 'stance') || [])
  }

  getModules() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'avd12module') || [])
    return comp
  }
  
  getCoreModules(modules) {
    let comp = foundry.utils.duplicate(modules.filter(item => item.system.type == 'core') || []);
    return comp
  }
  getSecondaryModules(modules) {
    let comp = foundry.utils.duplicate(modules.filter(item => item.system.type == 'secondary') || []);
    return comp
  }
  getOriginModules(modules) {
    let comp = foundry.utils.duplicate(modules.filter(item => (item.system.type == 'racial') || item.system.type == 'alteration' || item.system.type == "planar") || []);
    return comp
  }

  getCraftingTraits(){
    return this.tmpCraftingTraits;
  }

  santizeFormula(formula){
    let parseTokens = Avd12Utility.findAtTokens(formula)
    if(parseTokens){
        for(let i =0; i < parseTokens.length; i++){
          let val = Avd12Utility.getMappedValue(this, parseTokens[i])
          if(val == "-1"){
            formula = formula.replace(parseTokens[i], "");
          }else{
            formula = formula.replace(parseTokens[i], val);
          }
        }
      }
      return formula;
  }

  sanitizeItem(list){
    list.forEach(trait => {
      let parseTokens = Avd12Utility.findAtTokens(trait.system.description)
      if(parseTokens){
        for(let i =0; i < parseTokens.length; i++){
          let val = Avd12Utility.getMappedValue(this, parseTokens[i])
          if(val == "-1"){
            trait.system.description = trait.system.description.replace(parseTokens[i], "");
          }else{
            trait.system.description = trait.system.description.replace(parseTokens[i], val);
          }
        }
      }
    })

    return list;
  }

  getNpcTraits(){
    let list = foundry.utils.duplicate(this.items.filter(item => item.type == 'trait') || []);
    return this.sanitizeItem(list);
  }

  getNpcActions(){
    let list = foundry.utils.duplicate(this.items.filter(item => item.type == 'action') || []);
    return this.sanitizeItem(list);
  }
  getNpcReactions(){
    let list = foundry.utils.duplicate(this.items.filter(item => item.type == 'reaction') || []);
    return this.sanitizeItem(list);
  }
  getNpcFreeactions(){
    let list = foundry.utils.duplicate(this.items.filter(item => item.type == 'freeaction') || []);
    return this.sanitizeItem(list);
  }

  getActionById(id){
    if(this.type == "character"){
      let tmpActions = this.getActions();
      for(let i in tmpActions){
        if(tmpActions[i]._id == id){
          return tmpActions[i];
        }
      }
    }else if(this.type == "npc"){
      return this.items.get(id);
    }
  }

  getActions(){
    return foundry.utils.duplicate(this.items.filter(item => item.type == 'action') || []);
  }

  getLanguages(){
    return foundry.utils.duplicate(this.items.filter(item => item.type == 'language') || []);
  }

  getTraits(type){
    return [
      ...foundry.utils.duplicate(this.items.filter(item => item.type === 'trait' && item.system.traittype === type) || []),
      ...foundry.utils.duplicate(this.tmpTraits.filter(trait => trait.system.traittype === type) || [])];
  }

  getFreeActions(){
    return foundry.utils.duplicate(this.items.filter(item => item.type == 'freeaction') || []);
  }
  getReactions(){
    return foundry.utils.duplicate(this.items.filter(item => item.type == 'reaction') || []);
  }
  getBallads(){
    return foundry.utils.duplicate(this.items.filter(item => item.type == 'ballad') || []);
  }

  /* -------------------------------------------- */
  getRelevantAttribute(attrKey) {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'skill' && item.system.attribute == attrKey) || []);
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
    return foundry.utils.duplicate(this.items.filter(item => item.type == "equipment") || [])
  }

  /* ------------------------------------------- */
  async addModuleLevel(moduleId, levelChoice) {
    for (let itemId in levelChoice.features) {
      let itemData = foundry.utils.duplicate(levelChoice.features[itemId])
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
    if (toDelete.length > 0) {
      await this.deleteEmbeddedDocuments('Item', toDelete)
    }
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
      }else {
        await this.updateEmbeddedDocuments("Item", [{ _id: object.id, 'system.containerid': containerId }])
      }
    } else if (object && object.system.containerid) { // remove from container

      await this.updateEmbeddedDocuments("Item", [{ _id: object.id, 'system.containerid': "" }]);
    }
  }

    //######## MODULES #############

    getMinimumModulePoints() {
      return getMinimumModulePoints(this);
    }
  
    async updateModulePoints(delta){
      updateModulePoints(this, delta);
    }
  
    getTotalModulePoints(){
      return getTotalModulePoints(this);
    }
  
    getSpentModulePoints(module) {
      return getSpentModulePoints(module);
    }
  async updateModuleSelection(item, location, selection){
    updateModuleSelection(this,item,location,selection)
  } 

   //######## END MODULES #############

  /* -------------------------------------------- */
  async preprocessItem(event, item, onDrop = false) {

    if (item.system.focus && item.system.focus?.isfocus) {
      let focusItem = this.items.find(it => it.system.focus?.isfocus)
      if (focusItem) {
        ui.notifications.warn("You already have a Focus Item in your equipment.")
        return false
      }
    }else if(item.type == "avd12module"){
      if(!item.system.origin){
        if(this.system.module_points < 2){
          ui.notifications.warn("Not enough module points");
          return false;
        }else{(
          await this.updateModulePoints(-2));
        }
      }else{
         //this costs nothing
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
      let focusBonus = this.items.filter(it => it.system.focuspointsbonus > 0).reduce((sum, item2) => sum = item2.system.focuspointsbonus, 0)
      let focusregenbonus = this.items.filter(it => it.system.focusregenbonus > 0).reduce((sum, item2) => sum = item2.system.focusregenbonus, 0)
      let burnchancebonus = this.items.filter(it => it.system.burnchancebonus > 0).reduce((sum, item2) => sum = item2.system.burnchancebonus, 0)

      let focusPoints = focusData.focusPoints + focusBonus
      let focusRegen = focusData.focusRegen + focusregenbonus
      if (focusPoints != this.system.focus.focuspoints || focusRegen != this.system.focus.focusregen) {
        let focusData = foundry.utils.duplicate(this.system.focus)
        focusData.focuspoints = focusPoints
        focusData.focusregen = focusRegen
        this.update({ 'system.focus': focusData })
      }

      return {
        focusPoints: focusPoints,
        burnChance: focusData.burnChance + burnchancebonus,
        focusRegen: focusRegen,
        spellAttackBonus: focusData.spellAttackBonus,
        spellDamageBonus: focusData.spellDamageBonus,
        currentFocusPoints: this.system.focus.currentfocuspoints
      }
    }
    return {
      focusPoints: 0,
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
  clearInitiative(){
    this.getFlag("world", "initiative", -1)
  }
  /* -------------------------------------------- */
  getInitiativeScore(combatId, combatantId) {
    if (this.type == 'character') {
      let initiative = this.system.universal.skills.initiative.finalvalue;
      if (!initiative || initiative == -1) {
        ChatMessage.create( { content: "Roll your initiative for this combat"} )
      }
      return initiative
    }
    return -1;
  }

  /* -------------------------------------------- */
  getSubActors() {
    let subActors = [];
    for (let id of this.system.subactors) {
      subActors.push(foundry.utils.duplicate(game.actors.get(id)))
    }
    return subActors;
  }
  /* -------------------------------------------- */
  async addSubActor(subActorId) {
    let subActors = foundry.utils.duplicate(this.system.subactors);
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

  syncRoll(rollData) {
    this.lastRollId = rollData.rollId;
    Avd12Utility.saveRollData(rollData);
  }

  async processDeletedItem(itemId){
    const item = fromUuidSync(itemId)
    let itemFull
    if (item == undefined) {
      itemFull = this.items.get( itemId)
    } else {
      if (item && item.system) {
        itemFull = item
      } else {
        itemFull = await Avd12Utility.searchItem( item )
      }
    }
    if(itemFull.type == "avd12module"){
      //deleted a module
      let refundedPoints = this.getSpentModulePoints(itemFull);
      await this.updateModulePoints(refundedPoints);
    }
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
  async inChangeQuantity(objetId, amt) {
    let objetQ = this.items.get(objetId)
    if (objetQ) {
      let newQ = Math.min(999, Math.max(0, amt));
      const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'system.quantity': newQ }]) // pdates one EmbeddedEntity
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
  getCommonRollData() {
    let rollData = Avd12Utility.getBasicRollData()
    rollData.alias = this.name
    rollData.actorImg = this.img
    rollData.actorId = this.id
    rollData.img = this.img
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
    rollData.conditions = this.system.conditions;
    Avd12Utility.rollAvd12(rollData)
  }

  /* -------------------------------------------- */
  async rollFormula(actionData, diceFormula, skipDialog) {
    let rollData = this.getCommonRollData()
    rollData.action = actionData;
    rollData.diceFormula = diceFormula
    rollData.title = actionData.name;
    rollData.img = actionData.img;
    await this.startRoll(rollData, skipDialog)
  }

  /* -------------------------------------------- */
  rollSkill(attrKey, skillKey, skipDialog) {
    let attr = this.system.attributes[attrKey]
    let skill = attr.skills[skillKey]
    if (skill) {
      skill = foundry.utils.duplicate(skill)
      skill.name = Avd12Utility.upperFirst(skillKey)
      skill.attr = foundry.utils.duplicate(attr)
      let rollData = this.getCommonRollData()
      rollData.mode = "skill"
      //rollMode.skillKey = skillKey
      rollData.modifier = 99
      rollData.skill = skill
      rollData.title = "Roll Skill " + skill.name 
      rollData.img = null;
      this.startRoll(rollData, skipDialog)
    }
  }

  rollCrafting(craftKey) {
    let craft = {skill : this.system.bonus.craft[craftKey]};
    craft.name = Avd12Utility.upperFirst(craftKey)
    let rollData = this.getCommonRollData()
    rollData.mode = "craft"
    rollData.modifier = 99
    rollData.crafting = craft;
    rollData.title = "Roll Craft " + craft.name 
    rollData.img = null;
    this.startRoll(rollData)
  }

  rollOffense(attackKey) {
    let attack = Avd12Utility.getNestedProperty(this, attackKey);
    
    let offense = {attack:attack}
    offense.name = Avd12Utility.upperFirst(attackKey.split('.')[2]) + " Attack";
    let rollData = this.getCommonRollData()
    rollData.mode = "offense"
    rollData.modifier = attack;
    rollData.offense = offense;
    rollData.title = "Roll " + offense.name 
    rollData.img = null;
    this.startRoll(rollData)
    
  }

  rollUniversal(skillKey) {
    let skill = this.system.universal.skills[skillKey]
    if (skill) {
      skill = foundry.utils.duplicate(skill)
      skill.name = Avd12Utility.upperFirst(skillKey)
      let rollData = this.getCommonRollData()
      rollData.mode = "skill"
      rollData.skill = skill
      rollData.title = "Roll Skill " + skill.name 
      rollData.img = skill.img
      this.startRoll(rollData)
    }
  }

  getSpellShotAttack(){
    let focus = this.getSpellShotFocus();
    if(focus){
      return focus.system.bonus.attack +  this.system.bonus.ranged.attack;
    }else{
      return 0;
    }
  }

  getSpellShotRange(){
    let focus = this.getSpellShotFocus();
    if(focus){
      switch(focus.system.category){
        case "ulightranged":
          return focus.system.maxrange + this.system.bonus.ranged.max_range_bonus_ulight;
        case "lightranged":
          return focus.system.maxrange + this.system.bonus.ranged.max_range_bonus_light;
      case "heavyranged":
          return focus.system.maxrange + this.system.bonus.ranged.max_range_bonus_heavy;
      }
    }else{
      return 0;
    }
  }
  
  getSpellFistAttack(){
    let focus = this.getSpellFistFocus();
    if(focus){
      return focus.system.bonus.attack +  this.system.bonus.unarmed.attack;
    }else{
      return 0;
    }
  }

  isSpellFistSpell(spell){
    if((spell.system.spelltype == "projectile" || spell.system.spelltype == "melee attack" || spell.system.spelltype == "ray") && (spell.system.area_type != "radius" && spell.system.area_type != "line" && spell.system.area_type != "cone")){
      return true;
    } 
    return false;
  }

  isSpellShotSpell(spell){
    if((spell.system.spelltype == "projectile" || spell.system.spelltype == "ray") && (spell.system.area_type != "radius" && spell.system.area_type != "line" && spell.system.area_type != "cone")){
      return true;
    } 
    return false;
  }

  async channelSpell(channeledSpell, userData) {
    let spell = foundry.utils.duplicate(channeledSpell)
    let rollData = this.getCommonRollData()
    rollData.mode = "spell"
    rollData.spell = spell
    rollData.spellAttack = this.type == "npc" ? this.system.bonus.npc.spell_accuracy :this.system.bonus.spell.attack
      //Spellshot
      if(this.system.bonus.traits.spellshot && (spell.system.spelltype == "projectile" || spell.system.spelltype == "ray")){
        rollData.spellAttack = Math.max(this.getSpellShotAttack(), this.system.bonus.spell.attack);
      }else if(this.system.bonus.traits.spellfist && this.isSpellFistSpell(spell)){
        rollData.spellAttack = Math.max(this.getSpellFistAttack(), this.system.bonus.spell.attack);
      }
      //no longer needed...
      //rollData.spellDamage = this.system.bonus.spell.damage
      const powerModifier = isNaN(userData.powerModifier) ? 0 : parseInt(userData.powerModifier);
      const attackModifier = isNaN(userData.attackModifier) ? 0 : parseInt(userData.attackModifier);

      rollData.spellCost = Avd12Utility.getSpellCost(spell) + powerModifier;
      let currentFocusPoints = this.system.focus.currentfocuspoints;

      if(channeledSpell.unlinkedToken)
        currentFocusPoints = channeledSpell.unlinkedToken.system.focus.currentfocuspoints;

      if(rollData.spellCost > currentFocusPoints){
        rollData.nen = true;
        let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
          content: await renderTemplate(`systems/avd12/templates/chat/chat-utility-spell.hbs`, rollData)
        })
        msg.setFlag("world", "rolldata", rollData)
      }else{
        rollData.spellAttack = rollData.spellAttack;
        rollData.bonusMalusRoll = attackModifier;
        rollData.title = "Roll Spell " + spell.name
        rollData.img = spell.img
        if (spell.system.spelltype != "utility") {
          if(channeledSpell.unlinkedToken)
            channeledSpell.unlinkedToken.update({ 'system.focus.currentfocuspoints':  channeledSpell.unlinkedToken.system.focus.currentfocuspoints - rollData.spellCost});
          else
            this.update({ 'system.focus.currentfocuspoints':  this.system.focus.currentfocuspoints - rollData.spellCost});
          this.startRoll(rollData, true)
        } else {  
          let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
            content: await renderTemplate(`systems/avd12/templates/chat/chat-utility-spell.hbs`, rollData)
          })
          msg.setFlag("world", "rolldata", rollData)
        }
      }

      userData.button.disabled = false;
    }
  
  async rollSpellDamage(spellId, button) {
    let spell = this.items.get(spellId)
    if (spell) {
      if(spell.system.damage == "")
        return;
      spell = foundry.utils.duplicate(spell)
      let rollData = this.getCommonRollData()
      rollData.weapon = spell
      rollData.spellDamage = this.type == "npc" ? this.system.bonus.npc.spell_power :this.system.bonus.spell.damage
      rollData.title = "Roll Spell Damage " + spell.name
      rollData.img = spell.img
      rollData.mode = "weapon-damage"
      rollData.damageType = spell.system.damagetype;
      
      rollData.damageFormula = spell.system.damage + "+" + rollData.spellDamage;
      rollData.img = spell.img
      let myRoll = await new Roll(rollData.damageFormula).evaluate();
  
      myRoll.diceData = Avd12Utility.setDiceDisplay(myRoll);
      await Avd12Utility.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
      rollData.roll = myRoll
      let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
        content: await renderTemplate(`systems/avd12/templates/chat/chat-damage-result.hbs`, rollData)
      });
      if(button){
        button.disabled = false;
      }
      msg.setFlag("world", "rolldata", rollData)
    } else {
      ui.notifications.warn("Unable to find the relevant spell.")
    }
  }

  /* -------------------------------------------- */
  spentFocusPoints(spellCost) {
    const updatedFocus = Math.max(0, this.system.focus.currentfocuspoints -= parseInt(spellCost));
    this.update({'system.focus.currentfocuspoints': updatedFocus})
  }

  /* -------------------------------------------- */
  rollWeapon(weaponId, skipDialog) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = this.prepareWeapon(weapon);
      let rollData = this.getCommonRollData()
      rollData.modifier = this.system.bonus[weapon.system.weapontype]
      rollData.mode = "weapon"
      rollData.weapon = weapon
      rollData.img = weapon.img
      this.startRoll(rollData, skipDialog)
    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }
  }


  rollThrowObject(weaponId, skipDialog) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon =  this.prepareThrowingAmmunition(weapon)
      let rollData = this.getCommonRollData()
      rollData.modifier = this.system.bonus[weapon.system.weapontype]
      rollData.mode = "weapon"
      rollData.weapon = weapon
      rollData.img = weapon.img
      this.startRoll(rollData, skipDialog)
    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }
  }
  
  async rollOtherWeaponDamage(weaponId, type){
    let weapon = this.prepareWeapon(this.items.get(weaponId));
    if (!weapon) {
      ui.notifications.warn("Unable to find the relevant weapon ");
      return;
    }

    let rollData = this.getCommonRollData();
    if(type == "secondary"){
      rollData.damageFormula = weapon.system.damages.secondary["normal"]
      rollData.damageType = weapon.system.damages.secondary.damagetype;
    }else if(type == "tertiary"){
      rollData.damageFormula = weapon.system.damages.tertiary["normal"]
      rollData.damageType = weapon.system.damages.tertiary.damagetype;
    }else{
      ui.notifications.warn("Invalid Roll Type for damage");
      return;
    }
    rollData.mode = "weapon-damage"
    rollData.weapon = weapon
    rollData.img = weapon.img

    let myRoll = await new Roll(rollData.damageFormula).evaluate();
    await Avd12Utility.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"));
    myRoll.diceData = Avd12Utility.setDiceDisplay(myRoll);
    rollData.roll = myRoll
    let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/avd12/templates/chat/chat-damage-result.hbs`, rollData)
    })
    msg.setFlag("world", "rolldata", rollData)

  }

  async getSpellById(id){
    if(this.type == "character"){
      let foundSpell = null;
      let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'spell') || []);
      comp.forEach(spell => {
       if(spell._id == id)
        foundSpell = spell;
      });
      return foundSpell;
    }else if(this.type == "npc"){
      return this.items.get(id);
    }
  }

  getSpell(id){
    let foundSpell = null;
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'spell') || []);
    comp.forEach(spell => {
     if(spell._id == id){
      foundSpell = spell;
     }
    });
    return foundSpell;
  }

  getMove(id){
    for(let i = 0; i < this.tmpActions.length; i++){
      if(id == this.tmpActions[i].system.avd12_id)
        return this.tmpActions[i];
    }
    for(let i = 0; i < this.tmpReactions.length; i++){
      if(id == this.tmpReactions[i].system.avd12_id)
      return this.tmpReactions[i];
    }
    for(let i = 0; i < this.tmpFreeActions.length; i++){
      if(id == this.tmpFreeActions[i].system.avd12_id)
      return this.tmpFreeActions[i];
    }
    for(let i = 0; i < this.tmpBallads.length; i++){
      if(id == this.tmpBallads[i].system.avd12_id)
      return this.tmpBallads[i];
    }
  }

  async rollWeaponDamage(userData,weapon){
   
    let formula = "";
    switch(userData.hitType){
      case "normal":
        formula = weapon.system.damages.primary.normal + (userData.extraDamage == "" ? "" : "+" + userData.extraDamage );
        break;
      case "critical":
        formula = weapon.system.damages.primary.critical + (userData.extraDamage == "" ? "" : "+" + userData.extraDamage );
        break;
      case "brutal":
        formula = weapon.system.damages.primary.brutal + (userData.extraDamage == "" ? "" : "+" + userData.extraDamage );
        break;
      case "nobonus":
        formula = weapon.dice + (userData.extraDamage == "" ? "" : "+" + userData.extraDamage );
        break;
      default:
        return;
    }

    let rollData = this.getCommonRollData()
    rollData.damageFormula = formula
    rollData.mode = "weapon-damage"
    rollData.weapon = weapon
    rollData.damageType = userData.damageType;
    rollData.img = weapon.img
    let myRoll = await new Roll(rollData.damageFormula).evaluate();
    myRoll.diceData = Avd12Utility.setDiceDisplay(myRoll);
    await Avd12Utility.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
    rollData.roll = myRoll
    let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/avd12/templates/chat/chat-damage-result.hbs`, rollData)
    })
    msg.setFlag("world", "rolldata", rollData)

  }


  async showWeaponDamageDialog(weaponId, hitType, shift){
    let dice = "";
    if(shift){
      this.rollQuickWeaponDamage(weaponId, hitType);
    }else{
      let foundWeapon = this.items.get(weaponId)
      if(!foundWeapon)
        return;
      let weapon = null;  
      if(hitType == "throw"){
        weapon = this.prepareThrowingAmmunition(foundWeapon)
      }else{
        weapon = this.prepareWeapon(foundWeapon) 
      }

      weapon.hitType = hitType;
      let dialog = await Avd12WeaponDamageDialog.create(this, weapon)
      dialog.render(true)
    }
  }

  /* -------------------------------------------- */
  async rollQuickWeaponDamage(weaponId, hitType) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = foundry.utils.duplicate(weapon)
      this.prepareWeapon(weapon)
      let rollData = this.getCommonRollData()
     
      rollData.damageFormula = weapon.system.damages.primary[hitType]
      rollData.mode = "weapon-damage"
      rollData.weapon = weapon
      rollData.damageType = weapon.system.damages.primary.damagetype;
      rollData.img = weapon.img

      let myRoll = await new Roll(rollData.damageFormula).evaluate();

      await Avd12Utility.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
      rollData.roll = myRoll
      let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
        content: await renderTemplate(`systems/avd12/templates/chat/chat-damage-result.hbs`, rollData)
      })
      msg.setFlag("world", "rolldata", rollData)
    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }
  }

  /* -------------------------------------------- */
  async startRoll(rollData, skipDialog) {
    this.syncRoll(rollData)
    rollData.conditions = this.system.conditions;  
    if(!skipDialog){
    let rollDialog = await Avd12RollDialog.create(this, rollData)
    rollDialog.render(true)
    }else{
      Avd12Utility.rollAvd12(rollData);
    }
  }

  async takeDamage(damageData){
    let dialog = await Avd12DamageDialog.create(this, damageData)
    dialog.render(true)
  }

  async addHealth(damageData){
    let dialog = await Avd12HealthDialog.create(this, damageData)
    dialog.render(true)
  }

 

  async importCharacter(data){
    importCharacter(this, data);
 }

 getPowerPercentage(){
   let percentage = 100 - (this.system.focus.currentfocuspoints / this.system.focus.focuspoints * 100);
   if(percentage <= 0)
     return {primary:"0%", secondary:"0%"};
   return {primary:(percentage - 5)+"%", secondary:(percentage+5)+"%"}
 }

 getHealthPercentage(){
   let percentage = 100 - (this.system.health.value /  this.system.health.max * 100);
   if(percentage <= 0)
     return {primary:"0%", secondary:"0%"};
   return {primary:(percentage-5)+"%", secondary:(percentage+5)+"%"}
 }

  async essenceBurn(){
      let burn = {burnValue : this.system.focus.burn_chance};
      let rollData = this.getCommonRollData()
      rollData.mode = "essenceburn"
      rollData.burn = burn;
      rollData.title = "Rolling Essence Burn";
      rollData.conditions = this.system.conditions;
      //this.syncRoll(rollData)
      Avd12Utility.rollAvd12(rollData)
  }  



}
