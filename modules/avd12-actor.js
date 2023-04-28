/* -------------------------------------------- */
import { Avd12Utility } from "./avd12-utility.js";
import { Avd12RollDialog } from "./avd12-roll-dialog.js";
import { Avd12RestDialog } from "./avd12-rest-dialog.js";
import { Avd12DamageDialog } from "./avd12-damage-dialog.js";

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
   * This overrided create() function adds initial items 
   * Namely: Basic skills, money, 
   * @param {Object} data        Barebones actor data which this function adds onto.
   * @param {Object} options     (Unused) Additional options which customize the creation workflow.
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


  updateCharacter(){

  }


  /* -------------------------------------------- */
  prepareBaseData() {
  }
  /* -------------------------------------------- */
  async prepareData() {
    super.prepareData()
  }


  async importData(data){
    //deletes all items
    await this.deleteEmbeddedDocuments("Item", [], {
      deleteAll: true,
    });

    /*Handle Attributes*/
    
    await this.update({'system':data.system});
    await this.update({ 'name': data.name})
    await this.update({ 'prototypeToken.name': data.name});
    await this.update({ 'prototypeToken.width': data.prototypeToken.width});
    await this.update({ 'prototypeToken.height':  data.prototypeToken.height});
    await this.update({ 'name': data.name})

    await this.createEmbeddedDocuments("Item", data.items);

    const image = await Avd12Utility.downloadImage(`https://localhost/upload/${data.imgurl}`)
    //const image = await Avd12Utility.downloadImage(`https://anyventured12.com/upload/${data.imgurl}`)
    if(image){
      let options = Avd12Utility.parse("avd12/characters/");
      var file = new File([image], data.imgurl);
      await Avd12Utility.uploadToPath(options.current, file);
      await this.update({ 'img': `avd12/characters/${data.imgurl}`})
      await this.update({ 'prototypeToken.texture.src': `avd12/characters/${data.imgurl}`})
    }
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


    /* -------------------------------------------- */
  prepareDerivedData() {
    this.tmpTraits = [];
    this.tmpFreeActions = [];
    this.tmpActions = [];
    this.tmpReactions = [];
    this.tmpBallads = [];

    if (this.type == 'character' || game.user.isGM) {
      this.system.encCapacity = this.getEncumbranceCapacity()
      this.buildContainerTree()

      
      this.clearData()
      this.rebuildSkills()
      this.rebuildSize()
      this.rebuildModules()
      this.rebuildBonuses()
      
      this.rebuildMitigations()
      this.rebuildEquipment()

      this.parseActiveEffects()
      this.rebuildBonuses()
      
      
      //we want to create a token, and assign the same token data?  i dont even know dude. 
     
    }
    super.prepareDerivedData();

  }


  
  parseActiveEffects(){
    //get lighting effects. ..
    let lightsource = null;
    if(this.parent){
      lightsource = this.getBestLightSource();
    }
    let LightSourceOn = false;
    let overrideLight = false;

    let lightObj = {dim:0, bright:0,  animation:{type:"none", speed:5, intensity:5, reverse:false}, color:"#000000"}
    this.temporaryEffects.forEach(effect => {
      switch(effect.flags.core.statusId){
        case "blind":
          this.system.bonus.weapon.attack -= 2;
          this.system.bonus.spell.attack -= 2;
          this.system.attributes.agility.skills.dodge.finalvalue -= 2;
          this.system.attributes.willpower.skills.resistance.finalvalue -= 2;
          this.system.attributes.might.skills.block.finalvalue -= 2;
          break;
        case "invisible":
          this.system.attributes.agility.skills.stealth.finalvalue += 3;
          //+2 on melee spells
          this.system.bonus.weapon.attack += 2;
          break;
        case "paralyzed":
            this.system.movement.walk.value = 0;
            
            //cant attack with melee weapons
          break;
        case "grappled":
          this.system.movement.walk.value = 0;
          //cant attack with melee weapons
          break;
        case "wounded3":
          //death roll
        case "wounded2":
          this.system.attributes.willpower.skills.endurance.finalvalue -= 2;
          //disable reactions
        case "wounded1":
          this.system.attributes.willpower.skills.endurance.finalvalue -= 2;
          break;
        case "deafened":
          this.system.attributes.willpower.skills.resistance.finalvalue -= 2;
          break;
        case "exhausted3":
          //can only channel once
        case "exhausted2":
          this.system.bonus.weapon.damage = 0;
          this.system.bonus.ranged.damage = 0;
          this.system.bonus.spell.damage = 0;
          this.system.bonus.slash.damage = 0;
          this.system.bonus.unarmed.damage = 0;
          this.system.bonus.pierce.damage = 0;
          this.system.bonus.blunt.damage = 0;
          //disable reactions
        case "exhausted1":
          this.system.movement.walk.value -= 2;
          break;
        case "prone":
          this.system.bonus.weapon.attack -= 1;
          this.system.bonus.spell.attack -= 1;
          this.system.movement.walk.value = 2;
          break;
        case "frozen":
          //blue?
          this.system.movement.walk.value = 0;
          this.system.mitigation.physical.value = 0;
          this.system.mitigation.cold.value = 99;
          lightObj.dim = 0.2
          lightObj.bright = 0.1
          lightObj.color = "#00bfff"
          lightObj.animation.type = "none"
          overrideLight = true;
          break;
        case "ignited":
          lightObj.dim = 0.5
          lightObj.bright = 0.3
          lightObj.color = "#ff2000"
          lightObj.animation.type = "torch"
          overrideLight = true;
          break;
        case "bleeding":
          break;
        case "lightsource":
          LightSourceOn = true;
           break;
        case "default":
          break;
      }
    })

    if(lightsource && LightSourceOn){
      this.parent.update({"light.dim":lightsource.dim})
      this.parent.update({"light.animation":lightsource.animation})
      this.parent.update({"light.bright":lightsource.bright})
      this.parent.update({"light.color":lightsource.color})
    }else if(overrideLight){
      this.parent.update({"light.dim":lightObj.dim})
      this.parent.update({"light.animation":lightObj.animation})
      this.parent.update({"light.bright":lightObj.bright})
      this.parent.update({"light.color":lightObj.color})
    }else if(this.parent){
      this.parent.update({"light.dim":0})
      this.parent.update({"light.bright":0})
    }

  }


  getBestLightSource(){

    let lightSources = this.items.filter(item => item.system.equipped && item.system.light)
    let bestLightSource = null;
    lightSources.forEach(item => {
      if(item.system.light.lightsource){
        if(bestLightSource){
          if(item.system.light.dim > bestLightSource.system.light.dim)
          bestLightSource = item;
        } else {
          bestLightSource = item;
        }
      }
    })

    if(bestLightSource)
      return bestLightSource.system.light;
    else
      return null;
    }

    resetLightsource(lightsource){


    
    lightsource.alpha = 0.5
    lightsource.angle = 360

    lightsource.animation.intensity = 5
    lightsource.animation.reverse = false
    lightsource.animation.speed = 5
    lightsource.animation.type = null
    
    lightsource.attenuation = 0.5
    lightsource.bright = 0
    //lightsource.color = null

    lightsource.coloration = 1
    lightsource.contrast = 0
    lightsource.darkness.min = 0
    lightsource.darkness.max = 1

    lightsource.dim = 0
    lightsource.luminosity = 0.5
    lightsource.saturation = 0
    lightsource.shadows = 0
    
    return lightsource

  }

  /* -------------------------------------------- */
  confirmDamage(damageData){
    damageData.mitigation = this.system.mitigation[damageData.damageType.toLowerCase()].value
    damageData.mitigated = damageData.mitigation + damageData.damageModifier;
    damageData.adjusted = Math.max(0,damageData.totalDamage - damageData.mitigated);

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

  ZREALM_CRAFTS = ["Ammocraft", "Alchemy", "Smithing", "Cooking", "Scribing", "Runecarving", "Engineering"];
  ZREALM_SKILLS = [
    "Academics",
    "Acrobatics",
    "Animals",
    "Arcanum",
    "Athletics",
    "Concentration",
    "Endurance",
    "Initiative",
    "Insight",
    "Medicine",
    "Performance",
    "Persuasion",
    "Search",
    "Stealth",
    "Strength",
    "Thievery",
    "Wilderness"
];

  parseItemSkills(skills, craft){
    
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
      this.system.attributes.willpower.skills.endurance.finalvalue += skills_array[6];
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


  parseFocus(focus){
    let focusData = Avd12Utility.computeFocusData(focus.system.focus);
    this.system.focus.burn_chance = focusData.burnChance;
    this.system.focus.focuspoints += focusData.focusPoints;
    this.system.focus.focusregen += focusData.focusRegen;
  }

  rebuildEquipment(){

  
    let allEquippedItems = this.items.filter(item => item.system.equipped)
    allEquippedItems.forEach(item => {
      this.parseItemSkills(item.system.skills, item.system.craft_skills)
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

  let equippedShield = this.items.find(item => item.type == "shield" && item.system.equipped)
    if(equippedShield){
      switch(equippedShield.system.category){
        case "lightshield":
          this.system.attributes.might.skills.block.finalvalue += (1 + this.system.bonus.when.shield.block);
          if(this.system.bonus.when.shield.remove_penalties == 0){

          }
          this.tmpReactions.push(Avd12Utility.getLightShieldReaction());
          break;
        case "heavyshield":
          this.system.attributes.might.skills.block.finalvalue += (1 + this.system.bonus.when.shield.block);
          if(this.system.bonus.when.shield.remove_penalties == 0){
            this.system.attributes.agility.skills.dodge.finalvalue -= 2;
            this.system.attributes.agility.skills.stealth.finalvalue -= 1;
            this.system.movement.walk.value -= 1;
          }
          this.tmpReactions.push(Avd12Utility.getHeavyShieldReaction());
          break;

      }
    } 
  }

  /* -------------------------------------------- */
  rebuildSkills() {
    this.system.health.max = this.system.level.value * 5 + 10;
    this.system.focus.focuspoints = 0;
    this.system.focus.focusregen = 0;
    this.system.focus.castpenalty = 0;
    /*
     "focus": {
          "burn_chance": 0,
          "focuspoints": 0,
          "focusregen": 0,
          "currentfocuspoints": 0,
          "castpenalty":0
        },
    */

    //we may need to allow the player to change this?
    this.system.movement.walk.value = 6;
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

        // Process additionnal bonuses
        for (let item of this.items) {
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
      for (let item of this.items) {
        if (item.system.mitigation && item.system.mitigation[mitiKey] && item.system.equipped) {
          mitigation.value += Number(item.system.mitigation[mitiKey].value)
        }
      }
    }
  }



  rebuildBonuses(){
    
    
    this.system.bonus.blunt.damage += this.system.bonus.weapon.damage;
    this.system.bonus.slash.damage += this.system.bonus.weapon.damage;
    this.system.bonus.pierce.damage += this.system.bonus.weapon.damage;
    this.system.bonus.ranged.damage += this.system.bonus.weapon.damage;
    this.system.bonus.blunt.attack += this.system.bonus.weapon.attack;
    this.system.bonus.slash.attack += this.system.bonus.weapon.attack;
    this.system.bonus.pierce.attack += this.system.bonus.weapon.attack;
    this.system.bonus.ranged.attack += this.system.bonus.weapon.attack;
    this.system.health.max += this.system.health.bonus;
    this.system.movement.speed = this.system.movement.walk.value;

    //reset 
    this.system.bonus.weapon.damage = 0;
    this.system.bonus.weapon.attack = 0;
    this.system.health.bonus = 0;


  }

  rebuildSize(){
    switch(this.system.biodata.size){
      case 2://small
        this.system.attributes.agility.skills.dodge.finalvalue += 1;
        this.system.attributes.agility.skills.stealth.finalvalue += 1;
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

  /* -------------------------------------------- */
  rebuildModules() {
    let totalModules = this.items.filter(item => item.type == 'module')
    totalModules.forEach(item => {
      let levels = item.system.levels;
      levels.forEach(level =>{
        level.choices.forEach(choice => {
          if(choice.selected){
            let features = choice.features;
            for (var prop in features) {
              let data = features[prop];
              switch(data.type){
                case "trait" :
                  switch(data.system.traittype){
                    case "skill":
                    case "bonus":
                    case "mitigation":  
                      _.set(this.system, data.system.bonusdata, _.get(this.system, data.system.bonusdata) + data.system.bonusvalue)
                      break;
                    case "feature":
                      //maybe decide what to do here?
                      break;
                    default:
                      break;
                  }
                break;
                case "action":
                  this.tmpActions.push(data);
                  break;
                case "reaction":
                  this.tmpReactions.push(data);
                  break;  
                case "freeaction":
                  this.tmpFreeActions.push(data);
                  break;
                case "ballad":
                  this.tmpBallads.push(data);
                  break;
                case "feature":
                  this.tmpTraits.push(data);
                  break;
                break;
              default:
                break;
              }
            }
          }
        })
      })
    })

 
   

    return;
  }

  clearData(){
    for (let mitiKey in this.system.mitigation) {
      let mitigation = this.system.mitigation[mitiKey]
      mitigation.value = 0
    }

    //this.system.attributes.universal.skills.initiative.finalvalue = 0;
    //this.system.attributes.universal.skills.search.finalvalue = 0;

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
    let comp = duplicate(this.items.filter(item => item.type == 'weapon' && item.system.equipped) || [])
    comp.forEach(item => {
      this.prepareWeapon(item)
    })
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  parseEquippedGear(){
    let comp = duplicate(this.items.filter(item => item.type == 'weapon' && item.system.equipped) || [])
    comp.forEach(item => {
      this.prepareWeapon(item)
    })

  }
  /* -------------------------------------------- */
  getWeapons() {
    let comp = duplicate(this.items.filter(item => item.type == 'weapon' || item.type == 'equipable') || [])
    comp.forEach(item => {
      this.prepareWeapon(item)
    })
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getHeadwear() {
    let comp = duplicate(this.items.filter(item => item.type == 'headgear') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getGloves() {
    let comp = duplicate(this.items.filter(item => item.type == 'gloves') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getBoots() {
    let comp = duplicate(this.items.filter(item => item.type == 'boots') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getCloaks() {
    let comp = duplicate(this.items.filter(item => item.type == 'cloak') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getRings() {
    let comp = duplicate(this.items.filter(item => item.type == 'ring') || [])
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  /* -------------------------------------------- */
  getCraftingSkills() {
    let comp = duplicate(this.items.filter(item => item.type == 'craftingskill') || [])
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

  getSpells(){
    let comp = duplicate(this.items.filter(item => item.type == 'spell') || []);
    comp.forEach(spell => {
      if(spell.system.damagetype == "none"){
        spell.system.damagetype = "";
      }
      spell.system.rangeDescription = (spell.system.range > 0 ? spell.system.range : "") + " " + spell.system.range_type.charAt(0).toUpperCase() + spell.system.range_type.substring(1, spell.system.range_type.length);
      spell.system.actionDescription = spell.system.actions + " " + spell.system.action_type.charAt(0).toUpperCase() + spell.system.action_type.slice(1) + (spell.system.actions > 1 ? 's' :'');
      spell.system.improvedDescription = spell.system.description  + (spell.system.chargeEffect ? "\nCharge Effect: " + spell.system.chargeEffect:"")  + (spell.system.components ? "\nComponents: " + spell.system.components : "");  
      spell.system.damageDescription = spell.system.damage + " " + spell.system.damagetype.charAt(0).toUpperCase() + spell.system.damagetype.slice(1)
    })
    return comp
  }

  getBeginnerSpells(spells) {
    let comp = duplicate(spells.filter(item => item.system.level == 'beginner') || []);
    return comp
  }

  getNoviceSpells(spells) {
    let comp = duplicate(spells.filter(item => item.system.level == 'novice') || []);
    return comp
  }

  getExpertSpells(spells) {
    let comp = duplicate(spells.filter(item => item.system.level == 'expert') || []);
    return comp
  }

  getMasterSpells(spells) {
    let comp = duplicate(spells.filter(item => item.system.level == 'master') || []);
    return comp
  }

  getGrandmasterSpells(spells) {
    let comp = duplicate(spells.filter(item => item.system.level == 'grandmaster') || []);
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
    //why are we doing this?
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
  addPrimaryDamage(damage, bonusDamage, dice) {
    if (damage.damagetype != "none" && damage.dice) {
      let fullBonus = Number(bonusDamage) + Number(damage.bonus)
      damage.dice = dice;
      damage.normal = damage.dice + '+' + fullBonus
      damage.critical = damage.dice + '+' + Number(fullBonus) * 2
      let parser = damage.dice.match(/(\d+)(d\d+)/)
      let nbDice = 2
      if (parser && parser[1]) {
        nbDice = Number(parser[1]) * 2
      }
      damage.brutal = nbDice + parser[2] + "+" + Number(fullBonus) * 2
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

  /* -------------------------------------------- */
  prepareWeapon(weapon) {

    if(weapon.type == 'equipable'){
      return;
    }

    weapon.attackBonus = this.system.bonus.weapon.attack + weapon.system.attackbonus + this.system.bonus[weapon.system.weapontype].attack
    let bonusDamage = this.system.bonus.weapon.damage + this.system.bonus[weapon.system.weapontype].damage
    let upgraded = this.system.bonus[weapon.system.weapontype].upgraded;
    let dice = "";
  
    switch(weapon.system.category){
      case "ulightranged":
        weapon.system.minrange -= this.system.bonus.ranged.min_range_bonus_ulight;
        weapon.system.maxrange += this.system.bonus.ranged.max_range_bonus_ulight;
        break;
      case "lightranged":
        weapon.system.minrange -= this.system.bonus.ranged.min_range_bonus_light;
        weapon.system.maxrange += this.system.bonus.ranged.max_range_bonus_light;
        break;
      case "heavyranged":
        weapon.system.minrange -= this.system.bonus.ranged.min_range_bonus_heavy;
        weapon.system.maxrange += this.system.bonus.ranged.max_range_bonus_heavy;
        break;
    }

    if(weapon.system.minrange < 0){
      weapon.system.minrange = 0;
    }

    switch(weapon.system.category){
      case "unarmed":
        break;
        case "light1h":
          upgraded == 1 ? dice = "2d6" : dice = "1d8"
          break;
        case "heavy1h":
          upgraded == 1 ? dice = "2d8" : dice = "1d10"
          break;
        case "light2h":
          upgraded == 1 ? dice = "3d6" : dice = "3d4"
          break;
        case "heavy2h":
          upgraded == 1 ? dice = "3d8" : dice = "2d8"
          break;
        case "ulightranged":
          upgraded == 1 ? dice = "1d10" : dice = "1d6"
          break;
        case "lightranged":
          upgraded == 1 ? dice = "2d6" : dice = "1d8"
          break;
        case "heavyranged":
          upgraded == 1 ? dice = "3d6" : dice = "2d6"
          break;
    }

    if(weapon.system.damages.primary.dice == "1d4"){
      this.addPrimaryDamage(weapon.system.damages.primary, bonusDamage, "1d4")
      this.addOtherDamage(weapon.system.damages.secondary, bonusDamage)
      this.addOtherDamage(weapon.system.damages.tertiary, bonusDamage)
    }else{
      this.addPrimaryDamage(weapon.system.damages.primary, bonusDamage, dice)
      this.addOtherDamage(weapon.system.damages.secondary, bonusDamage)
      this.addOtherDamage(weapon.system.damages.tertiary, bonusDamage)
    }
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
    return this.tmpTraits;
  }

  getFreeActions(){
    return this.tmpFreeActions;
  }
  getActions(){
    return this.tmpActions;
  }
  getReactions(){
    return this.tmpReactions;
  }
  getBallads(){
    return this.tmpBallads;
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

      await this.updateEmbeddedDocuments("Item", [{ _id: object.id, 'system.containerid': "" }]);
    }
  }

  /* -------------------------------------------- */
  async preprocessItem(event, item, onDrop = false) {

    if (item.system.focus && item.system.focus?.isfocus) {
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
      let focusBonus = this.items.filter(it => it.system.focuspointsbonus > 0).reduce((sum, item2) => sum = item2.system.focuspointsbonus, 0)
      let focusregenbonus = this.items.filter(it => it.system.focusregenbonus > 0).reduce((sum, item2) => sum = item2.system.focusregenbonus, 0)
      let burnchancebonus = this.items.filter(it => it.system.burnchancebonus > 0).reduce((sum, item2) => sum = item2.system.burnchancebonus, 0)

      let focusPoints = focusData.focusPoints + focusBonus
      let focusRegen = focusData.focusRegen + focusregenbonus
      if (focusPoints != this.system.focus.focuspoints || focusRegen != this.system.focus.focusregen) {
        let focusData = duplicate(this.system.focus)
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
      //rollMode.skillKey = skillKey
      rollData.skill = skill
      rollData.title = "Roll Skill " + skill.name 
      rollData.img = skill.img
      this.startRoll(rollData)
    }
  }

  /* -------------------------------------------- */
  rollUniversal(skillKey) {
    let skill = this.system.universal.skills[skillKey]
    if (skill) {
      skill = duplicate(skill)
      skill.name = Avd12Utility.upperFirst(skillKey)
      let rollData = this.getCommonRollData()
      rollData.mode = "skill"
      //rollData.skillKey = skillKey
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
        this.spentFocusPoints(spell)
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
  spentFocusPoints(spell) {
    let spellCost = Avd12Utility.getSpellCost(spell)
    let focusData = duplicate(this.system.focus)
    focusData.currentfocuspoints -= spellCost
    focusData.currentfocuspoints = Math.max(focusData.currentfocuspoints, 0)
    this.update({ 'system.focus': focusData })
  }
  /* -------------------------------------------- */
  rollCrafting(craftId) {
    let crafting = this.items.get(craftId)
    if (crafting) {
      crafting = duplicate(crafting)
      let rollData = this.getCommonRollData()
      rollData.mode = "crafting"
      rollData.crafting = crafting
      rollData.img = crafting.img
      this.startRoll(rollData)
    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }
  }
  /* -------------------------------------------- */
  rollWeapon(weaponId) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = duplicate(weapon)
      this.prepareWeapon(weapon)
      let rollData = this.getCommonRollData()
      rollData.modifier = this.system.bonus[weapon.system.weapontype]
      rollData.mode = "weapon"
      rollData.weapon = weapon
      rollData.img = weapon.img
      this.startRoll(rollData)
    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }
  }
  

  /* -------------------------------------------- */
  async rollSecondaryWeaponDamage(weaponId) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = duplicate(weapon)
      this.prepareWeapon(weapon)
      let rollData = this.getCommonRollData()
      rollData.damageFormula = weapon.system.damages.secondary["normal"]
      rollData.mode = "weapon-damage"
      rollData.weapon = weapon
      rollData.damageType = weapon.system.damages.secondary.damagetype
      rollData.img = weapon.img
      let myRoll = new Roll(rollData.damageFormula).roll({ async: false })
      await Avd12Utility.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
      rollData.roll = myRoll
      let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
        content: await renderTemplate(`systems/fvtt-avd12/templates/chat/chat-damage-result.hbs`, rollData)
      })
      msg.setFlag("world", "rolldata", rollData)

    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }
  }

  async rollTertiaryWeaponDamage(weaponId) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = duplicate(weapon)
      this.prepareWeapon(weapon)
      let rollData = this.getCommonRollData()
      rollData.damageFormula = weapon.system.damages.tertiary["normal"]
      rollData.mode = "weapon-damage"
      rollData.weapon = weapon
      rollData.damageType = weapon.system.damages.tertiary.damagetype
      rollData.img = weapon.img
      let myRoll = new Roll(rollData.damageFormula).roll({ async: false })
      await Avd12Utility.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
      rollData.roll = myRoll
      let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
        content: await renderTemplate(`systems/fvtt-avd12/templates/chat/chat-damage-result.hbs`, rollData)
      })
      msg.setFlag("world", "rolldata", rollData)

    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }
  }

  /* -------------------------------------------- */
  async rollWeaponDamage(weaponId, damageType) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = duplicate(weapon)
      this.prepareWeapon(weapon)
      let rollData = this.getCommonRollData()
      rollData.damageFormula = weapon.system.damages.primary[damageType]
      rollData.mode = "weapon-damage"
      rollData.weapon = weapon
      rollData.damageType = weapon.system.damages.primary.damagetype;
      rollData.img = weapon.img
      let myRoll = new Roll(rollData.damageFormula).roll({ async: false })
      await Avd12Utility.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
      rollData.roll = myRoll
      let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
        content: await renderTemplate(`systems/fvtt-avd12/templates/chat/chat-damage-result.hbs`, rollData)
      })
      msg.setFlag("world", "rolldata", rollData)

    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }
  }

  /* -------------------------------------------- */
  async startRoll(rollData) {
    this.syncRoll(rollData)
    let rollDialog = await Avd12RollDialog.create(this, rollData)
    rollDialog.render(true)
  }

  async takeDamage(damageData){
    let dialog = await Avd12DamageDialog.create(this, damageData)
    dialog.render(true)
  }


  async takeRest(data, favorable){
    let totalPowerRegen = this.system.focus.focusregen;
    if(Number(data.bonusPower)){
      totalPowerRegen += Number(data.bonusPower);
    }
    let totalHealthRegen = this.system.level.value * (favorable ? 2 : 1);
    if(Number(data.bonusHealth)){
      totalHealthRegen += Number(data.bonusHealth);
    }

    let restData = {};
    restData.actor = this;
   

    
    let currentHealth = this.system.health.value;
    let currentPower = this.system.focus.currentfocuspoints;

    this.system.health.value = Math.min(this.system.health.max, (totalHealthRegen + this.system.health.value))
    this.system.focus.currentfocuspoints = Math.min(this.system.focus.focuspoints, (totalPowerRegen + this.system.focus.currentfocuspoints))
    this.update({ 'system.health.value': this.system.health.value})
    this.update({ 'system.focus.currentfocuspoints': this.system.focus.currentfocuspoints})

    restData.health = this.system.health.value - currentHealth;
    restData.power = this.system.focus.currentfocuspoints - currentPower;
   
    if(favorable){
      restData.favorable = "Favorable"
    }else{
      restData.favorable = "";
    }

    Avd12Utility.createRestChatMessage(restData);

  }

  async rest(){
    let dialog = await Avd12RestDialog.create(this)
    dialog.render(true)
  }

  async essenceBurn(){

    /*
     skill = duplicate(skill)
      skill.name = Avd12Utility.upperFirst(skillKey)
      skill.attr = duplicate(attr)
      let rollData = this.getCommonRollData()
      rollData.mode = "skill"
      //rollMode.skillKey = skillKey
      rollData.skill = skill
      rollData.title = "Roll Skill " + skill.name 
      rollData.img = skill.img
      this.startRoll(rollData)
      */

      let burn = {burnValue : this.system.focus.burn_chance};
      let rollData = this.getCommonRollData()
      rollData.mode = "essenceburn"
      rollData.burn = burn;

      rollData.title = "Rolling Essence Burn";
      
      //this.syncRoll(rollData)
      Avd12Utility.rollAvd12(rollData)
    
  }  
}
