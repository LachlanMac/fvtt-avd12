/* -------------------------------------------- */
import { Avd12Utility } from "./avd12-utility.js";
import { Avd12RollDialog } from "./avd12-roll-dialog.js";
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

  /* -------------------------------------------- */
  rebuildSkills() {
    if(this.system.meta.static){
      console.log("STATIC!");
      return;
    }else{
    }

    
    let armorPenalties = Avd12Utility.getArmorPenalty(this.items.find(item => item.type == "armor"))
    let shieldPenalties = Avd12Utility.getArmorPenalty(this.items.find(item => item.type == "shield"))

    //health formula
    this.system.health.max = this.system.level.value * 5 + 10;

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
      
        if (armorPenalties[skillKey]) {
          skill.modifier += Number(armorPenalties[skillKey])
        }
        // Apply shield penalties
        if (shieldPenalties[skillKey]) {
          skill.modifier += Number(shieldPenalties[skillKey])
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
        if (item.system.mitigation && item.system.mitigation[mitiKey]) {
          mitigation.value += Number(item.system.mitigation[mitiKey].value)
        }
      }
    }
  }

  rebuildBonuses(){
    
    
    this.system.bonus.blunt.damage += this.system.bonus.weapon.damage;
    this.system.bonus.slash.damage += this.system.bonus.weapon.damage;
    this.system.bonus.pierce.damage += this.system.bonus.weapon.damage;

    this.system.bonus.blunt.attack += this.system.bonus.weapon.attack;
    this.system.bonus.slash.attack += this.system.bonus.weapon.attack;
    this.system.bonus.pierce.attack += this.system.bonus.weapon.attack;

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
                      console.log(data.system.bonusdata)
                      _.set(this.system, data.system.bonusdata, _.get(this.system, data.system.bonusdata) + data.system.bonusvalue)
                      break;
                    case "feature":
                      console.log("FEATURE!");
                      break;
                    default:
                      console.log("**********\n",data,"\n*************");
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

    console.log(this.system);




    return;
    for (let bonusKey in this.system.bonus) {
      let bonus = this.system.bonus[bonusKey]
      for (let content in bonus) {
        let dataPath = bonusKey + "." + content
        //console.log("Parsing", bonusKey, content, dataPath)
        let availableTraits = this.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
        //get the traits in some other way?
        for (let trait of availableTraits) {
          console.log("XXXX", bonus);
          bonus[content] += Number(trait.system.bonusvalue)
        }
      }
    }
  }
  /* -------------------------------------------- */
  prepareDerivedData() {

    this.tmpTraits = [];
    this.tmpFreeActions = [];
    this.tmpActions = [];
    this.tmpReactions = [];

    if (this.type == 'character' || game.user.isGM) {
      this.system.encCapacity = this.getEncumbranceCapacity()
      this.buildContainerTree()
      this.computeHitPoints()
   
      this.rebuildSkills()
      this.rebuildModules()
      this.rebuildBonuses()
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
    let comp = duplicate(this.items.filter(item => item.type == 'weapon' && item.system.equipped) || [])
    comp.forEach(item => {
      this.prepareWeapon(item)
    })
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  getWeapons() {
    let comp = duplicate(this.items.filter(item => item.type == 'weapon') || [])
    comp.forEach(item => {
      this.prepareWeapon(item)
    })
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
    weapon.attackBonus = this.system.bonus.weapon.attack + weapon.system.attackbonus + this.system.bonus[weapon.system.weapontype].attack
    let bonusDamage = this.system.bonus.weapon.damage + this.system.bonus[weapon.system.weapontype].damage
    let upgraded = this.system.bonus[weapon.system.weapontype].upgraded;
    let dice = "";

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
          breakl
        case "lightranged":
          upgraded == 1 ? dice = "2d6" : dice = "1d8"
          break;
        case "heavyranged":
          upgraded == 1 ? dice = "3d6" : dice = "2d6"
          break;
    }

    this.addPrimaryDamage(weapon.system.damages.primary, bonusDamage, dice)
    this.addOtherDamage(weapon.system.damages.secondary, bonusDamage)
    this.addOtherDamage(weapon.system.damages.tertiary, bonusDamage)
    /*
    bonusDamage = this.system.bonus.weapon.damage + this.system.bonus[weapon.system.weapontype].crits
    
    bonusDamage = this.system.bonus.weapon.damage + this.system.bonus[weapon.system.weapontype].brutals
    this.addOtherDamage(weapon.system.damages.tertiary + bonusDamage)
    */
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

    /*
    let comp = duplicate(this.items.filter(item => item.type == 'trait') || [])
    console.log("TRAITS??!", comp);
    return comp
    */
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
      rollData.mode = "universal"
      rollData.skillKey = skillKey
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

}
