/* -------------------------------------------- */
import { Avd12Equipment } from "./character/avd12-equipment.js";
import { Avd12Utility } from "./avd12-utility.js";
import { Avd12RollDialog } from "./avd12-roll-dialog.js";
import { Avd12RestDialog } from "./avd12-rest-dialog.js";
import { Avd12DamageDialog } from "./avd12-damage-dialog.js";
import { Avd12HealthDialog } from "./avd12-health-dialog.js";
import { Avd12SpellAttackDialog } from "./avd12-spell-attack-dialog.js";
import { Avd12WeaponDamageDialog } from "./avd12-weapon-damage-dialog.js";




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
    if (data instanceof Array) {
      return super.create(data, options);
    }
    if (data.items) {
      let actor = super.create(data, options);
      return actor;
    }
    if (data.type == 'character') {
    }
    else if (data.type == 'npc') {

    }else if(data.type == 'expedition'){

    }
    return super.create(data, options);
  }

  async prepareData() {
    super.prepareData()
  }

  async importData(data){

    let actorRef= this;
    //deletes all items
    await this.deleteEmbeddedDocuments("Item", [], {
      deleteAll: true,
    });
    await this.update({'system.usages':[]});
    /*Handle Attributes*/

    data.system.health.value = this.system.health.value;
    data.system.focus.currentfocuspoints = this.system.focus.currentfocuspoints;
    
    await this.update({'system':data.system});
    await this.update({ 'name': data.name})
    await this.update({ 'prototypeToken.name': data.name});
    await this.update({ 'prototypeToken.width': data.prototypeToken.width});
    await this.update({ 'prototypeToken.height':  data.prototypeToken.height});
    await this.update({ 'name': data.name})

    if(game.user.isGM){
      await Avd12Utility.verifyPath(Avd12Utility.parse("avd12/characters/"));
    }

    // ***** IMPORT INVENTORY AND MODULES ******
    data.items.forEach(item =>{
      if(item.type == "action"){
        item.uses = { current: 3, max : 3};
      }
      if(item.type == "reaction"){
        item.uses = { current: 2, max : 2};
      }
    });

    await this.createEmbeddedDocuments("Item", data.items); 
    let stanceData = data.system.stance_data.split("-");
    let activeStance = stanceData.pop();
    let uniqueStances = [...new Set(stanceData)];
    for(let i = 0; i < uniqueStances.length; i++){
      await  game.packs.get('avd12.stances').getDocument(uniqueStances[i]).then(async function(x){
        if(uniqueStances[i]._id == activeStance)
          x.system.active = true;
        await actorRef.createEmbeddedDocuments('Item', [x]);
      });
    }

    const image = await Avd12Utility.downloadImage(`https://anyventured12.com/upload/${data.imgurl}`)
    
    if(image){
      let options = Avd12Utility.parse("avd12/characters/");
      var file = new File([image], data.imgurl);
      await Avd12Utility.uploadToPath(options.current, file);
      await this.update({ 'img': `avd12/characters/${data.imgurl}`})
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

  prepareDerivedData() {
    if(this.type == 'npc'){
      //this.clearData()
      let items = this.items.filter(item => item.type == "weapon" || item.type == "armor");
      items.forEach(item =>{
        //item.system.equipped = true;
        if(item.type == "armor"){
          //build armor
        }else if(item.type == "weapon"){
          //build weapon
        }

      });
      this.rebuildNPCSkills()
      this.parseActiveEffects()

    }else if (this.type == 'character' ) { //|| game.user.isGM <--- I dont know what this is

     
      this.system.health.max = this.system.level.value * 5 + 10;
      this.system.focus.focuspoints = 0;
      this.system.focus.focusregen = 0;
      this.system.focus.castpenalty = 0;
      this.system.movement.walk.value = 6;
      this.system.encCapacity = this.getEncumbranceCapacity()
      this.buildContainerTree()
      this.clearData()
      this.rebuildSkills()
      this.rebuildSize()
     
     
      this.rebuildTraits()
      this.rebuildMainTrait()
      console.log("1", this.name, this.system.bonus.ranged.attack);
    
      this.rebuildModules()
      console.log("2", this.name, this.system.bonus.ranged.attack);
      this.rebuildBonuses()
      console.log("3", this.name, this.system.bonus.ranged.attack);
      this.rebuildMitigations()
      this.rebuildEquipment()
      this.parseStances()
      this.parseActiveEffects()
      this.rebuildBonuses()
      console.log("4", this.name, this.system.bonus.ranged.attack);
    }else if (this.type == "expedition"){
      
    }
    super.prepareDerivedData();
  }
  
  isDuelistElligble(){

  }

  rebuildNPCSkills() {
    let armorPenalties = Avd12Utility.getArmorPenalty(this.items.find(item => item.type == "armor"))
    let shieldPenalties = Avd12Utility.getArmorPenalty(this.items.find(item => item.type == "shield"))

    for (let attrKey in this.system.attributes) {
      let attr = this.system.attributes[attrKey]
      for (let skillKey in attr.skills) {
        let dataPath = attrKey + ".skills." + skillKey + ".modifier"
        let skill = attr.skills[skillKey]

        //SOFT RESET
        if(this.system.imported == 0)
          skill.modifier = 0
      
        let availableTraits = this.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
        for (let trait of availableTraits) {
          skill.modifier += Number(trait.system.bonusvalue)
        }
        // Apply armor penalties
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


    //the master formula for sizes
      switch(Number(this.system.biodata.size)){
        case 1: 
          this.system.attributes.agility.skills.dodge.finalvalue += 2; 
          this.system.attributes.might.skills.block.finalvalue -= 2; 
          break;
        case 2: 
          this.system.attributes.agility.skills.dodge.finalvalue += 1; 
          this.system.attributes.might.skills.block.finalvalue -= 1;
          break;
        case 3: 
          break;
        case 4:  
          this.system.attributes.agility.skills.dodge.finalvalue -= 1; 
          break;
        case 5: 
          this.system.attributes.agility.skills.dodge.finalvalue -= 2; 
          this.system.attributes.might.skills.block.finalvalue -= 1;
          break;
        case 6: 
          this.system.attributes.agility.skills.dodge.finalvalue -= 2; 
          this.system.attributes.might.skills.block.finalvalue -= 2;
          break;
      }

    for (let skillKey in this.system.universal.skills) {
      let skill = this.system.universal.skills[skillKey]
      skill.finalvalue = 0;
      let dataPath = "universal.skills." + skillKey + ".modifier"
      let availableTraits = this.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
      for (let trait of availableTraits) {
        skill.modifier += Number(trait.system.bonusvalue)
      } 
      skill.finalvalue = skill.modifier; 
    }
    
    for(let mitiKey in this.system.mitigation){
      if(this.system.imported == 0)
        this.system.mitigation[mitiKey].value = 0;
    }

    for(let mitiKey in this.system.mitigation){
      let dataPath = "mitigation." + mitiKey + ".value"
      let availableTraits = this.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
      for (let trait of availableTraits) {
        this.system.mitigation[mitiKey].value += Number(trait.system.bonusvalue)
      }
    }

    let availableTraits = this.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == "mitigation.elemental.value")
    for (let trait of availableTraits) {
      this.system.mitigation.cold.value += Number(trait.system.bonusvalue)
      this.system.mitigation.fire.value += Number(trait.system.bonusvalue)
      this.system.mitigation.lightning.value += Number(trait.system.bonusvalue)
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

  async addStance(stance){
    let actorRef = this;
    await game.packs.get('avd12.stances').getDocument(stance).then(function(x){
      x.system.active = false;
      actorRef.createEmbeddedDocuments('Item', [x])
    });
  }

  parseStances(){
    let focusing = false;
    let activeStance = this.items.find(stance => stance.system.active == true && stance.type == "stance");

    if(!activeStance)
      return;
    switch(Number(activeStance.system.id)){
      case 1://neutral
          break;
      case 2://savage
          this.system.attributes.might.skills.block.finalvalue -= 2;
          this.system.attributes.agility.skills.dodge.finalvalue -= 2;
          //CRIT ON 11...
          break;
      case 3://light
          this.system.attributes.agility.skills.dodge.finalvalue += 1;
          this.system.movement.walk.value += 1;
          this.system.bonus.weapon.attack -= 1;
          break;
      case 4://defensive
          this.system.attributes.might.skills.block.finalvalue += 1;
          this.system.attributes.agility.skills.dodge.finalvalue += 1;
          this.system.attributes.willpower.skills.resistance.finalvalue += 1;
          this.system.bonus.weapon.attack -= 1;
          break;
      case 5://precise
          this.system.bonus.weapon.attack += 2;
          this.system.bonus.weapon.damage -= 4;
          break;
      case 6://focus
          focusing = true;
          this.system.attributes.willpower.skills.resistance.finalvalue += 2;
          break;
      case 7://wide
          this.system.bonus.traits.wideattacks = 1;
          this.system.movement.walk.value -= 1;
          break;
      case 8://dueling
          this.system.bonus.traits.dueling = 1;
          this.system.attributes.might.skills.block.finalvalue += 1;
          this.system.attributes.agility.skills.dodge.finalvalue += 1;
          break;
      case 9://quicktooss
          this.system.bonus.traits.quicktoss = 1;
          break;
      case 10://pivot
          //nothing
          break;
      case 11://control
          //nothing
          break;
      case 12://screen
          //partial cover
          break;
      case 13://NO EXIST
          //does not exist
          break;
      case 14:  //juggernaut  
          this.system.movement.walk.value -= 1;
          this.system.bonus.traits.juggernaut = 1;
          break;
      case 15://arsman
          this.system.bonus.weapon.damage += 2;
          this.system.bonus.traits.arsman = 1;
          break;
      case 16:  //reactive
          //
          break;
      case 17: //marskamn
          this.system.bonus.ranged.attack += 1;
          focusing = true;
          break;
      case 18:  //flowing strikes
          this.system.bonus.traits.flowingstrikes = 1;
          this.system.bonus.unarmed.attack += 1;
          focusing = true;
          break;
      case 19: //sentinel
          focusing = true;
          this.system.bonus.traits.sentinel = 1;
          break;
      case 20:  //dual wield
          this.system.bonus.traits.dualwield = 1;
          //nothing
          break;
      default:
          console.log("unknown active stance", activeStance.system.id);
    }
  }

  async parseActiveEffects(){
    let protoToken = this.prototypeToken;
    let lightsource = null;
    
    if(protoToken){ 
      //unlinked
      lightsource = this.getBestLightSource();
      if(this.getActiveTokens().length > 0){
        protoToken = this.getActiveTokens()[0].document;
      }
    }else{

    }
       let LightSourceOn = false;
    let overrideLight = false;
    let lightObj = {dim:0, bright:0, alpha:0.5, luminosity:0.5, animation:{type:"none", speed:5, intensity:5, reverse:false}, color:"#000000"}

    this.temporaryEffects.forEach(effect => {
      switch(effect.statuses.values().next().value){
        case "afraid":
          this.system.conditions.afraid = 1;
          break;
        case "bleeding":
          this.system.conditions.bleeding = 1;
          break;
        case "blind":
          this.system.conditions.blinded = 1;
          break;
        case "charmed":
          this.system.conditions.charmed = 1;
          break;
        case "confused":
          this.system.conditions.confused = 1;
          break;
        case "dazed":
          this.system.conditions.dazed = 1;
          break;
        case "deafened":
          this.system.conditions.deafened = 1;
          break;
        case "diseased":
          this.system.conditions.diseased = 1;
          break;
        case "enveloped":
          this.system.conditions.enveloped = 1;
          break;
        case "exhausted3":
          this.system.conditions.exhausted = 3;
          break;
        case "exhausted2":
          this.system.conditions.exhausted = 2;
            this.system.bonus.weapon.damage = 0;
            this.system.bonus.ranged.damage = 0;
            this.system.bonus.spell.damage = 0;
            this.system.bonus.slash.damage = 0;
            this.system.bonus.unarmed.damage = 0;
            this.system.bonus.pierce.damage = 0;
            this.system.bonus.blunt.damage = 0;
            //disable reactions
            break;
        case "exhausted1":
            this.system.conditions.exhausted = 1;
            this.system.movement.walk.value -= 2;
            this.system.universal.skills.initiative.finalvalue -= 2;
            break;
        case "frozen":
            this.system.conditions.frozen = 1;
            //blue?
            this.system.movement.walk.value = 0;
            this.system.mitigation.cold.value = 99;
            lightObj.dim = 0.2
            lightObj.bright = 0.1
            lightObj.color = "#00bfff"
            lightObj.animation.type = "none"
            overrideLight = true;
            break;
        case "grappled":
          this.system.conditions.grappled = 1;
          break;
        case "hidden":
          this.system.conditions.hidden = 1;
          break;
        case "ignited":
          this.system.conditions.ignited = 1;
          lightObj.dim = 1.5
          lightObj.bright = 1
          lightObj.color = "#ff3a00"
          lightObj.animation.type = "torch"
          overrideLight = true;
          break;
        case "invisible":
          this.system.conditions.invisible = 1;
          break;
        case "maddened":
          this.system.conditions.maddened = 1;
          break;
        case "muted":
          this.system.conditions.muted = 1;
          break;
        case "paralyzed":
          this.system.conditions.paralyzed = 1;
          break;
        case "poisoned":
          this.system.conditions.poisoned = 1;
          break;
        case "prone":
          this.system.conditions.prone = 1;
          this.system.movement.walk.value = 2;
          break;
        case "sleeping":
          this.system.conditions.sleeping = 1;
          break;
        case "stasis":
          this.system.conditions.stasis = 1;
          break;
        case "stunned":
          this.system.conditions.stunned = 1;
          break;
        case "trapped":
          this.system.conditions.trapped = 1;
          break;
        case "unconscious":
          this.system.conditions.unconscious = 1;
          break;
        case "wounded3":
          this.system.conditions.wounded = 3;
        case "wounded2":
          this.system.conditions.wounded = 2;
        case "wounded1":
          this.system.conditions.wounded = 1;
          break;
        case "lightsource":
          LightSourceOn = true;
           break;
        case "default":
          break;
      }
    
      //this.update({ 'system.conditions':  this.system.conditions});
    })

     

    if (game.user.isGM) {
      if (lightsource && LightSourceOn) {
          await protoToken.update({
              "light.dim": lightsource.dim,
              "light.animation": lightsource.animation,
              "light.bright": lightsource.bright,
              "light.color": lightsource.color,
              "light.alpha": lightsource.color_intensity,
              "light.luminosity": lightsource.luminosity
          });
      } else if (overrideLight) {
          await protoToken.update({
              "light.dim": lightObj.dim,
              "light.animation": lightObj.animation,
              "light.bright": lightObj.bright,
              "light.color": lightObj.color,
              "light.alpha": lightObj.color_intensity,
              "light.luminosity": lightObj.luminosity
          });
      } else if (protoToken) {
          await protoToken.update({
              "light.dim": 0,
              "light.bright": 0
          });
      }
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

  static chatListener(html){
    html.on("click", ".avd12-use-action button", this._onChatCardAction.bind(this));
    html.on("click", ".avd12-use-spell button", this._onChatCardSpell.bind(this));
  }

  static async _onChatCardSpell(event){
    event.preventDefault();
    Avd12Utility.logMessage("Custom Card Button Click Event");
    const button = event.currentTarget;
      button.disabled = true;
      const card = button.closest(".avd12-use-spell");
      const messageId = card.closest(".message").dataset.messageId;
      const message = game.messages.get(messageId);
      const spell = button.dataset.spell;
      const actor = await game.actors.get(message.speaker.actor);

      let actSpell = await actor.getSpellById(card.dataset.spellId);
      if(!actSpell){console.log("*AVD12 Error: No Action*");return;}

      let totalFocusPoints =  actor.system.focus.currentfocuspoints;
      let token = canvas.tokens.placeables.find(t => t.id === message.speaker.token)
      let actorLink = true;
      if(token?.document?.actorLink == false){
        actorLink = false;
        if(token.document.delta.system?.focus?.currentfocuspoints){
          //do nothing for now
        }else
          token.document.delta.system.focus = foundry.utils.duplicate(actor.system.focus); //initialize the delta
        
        totalFocusPoints = token.document.delta.system.focus.currentfocuspoints;
        actSpell.unlinkedToken = token.document.delta;
      }
      
      if ( !actor ) {console.log("*AVD12 Error: No Actor*");return};
      if ( !(game.user.isGM || actor.isOwner) ) return;
    
      switch(spell){
        case "attack":
          let dialog = await Avd12SpellAttackDialog.create(actor, actSpell)
          dialog.render(true)
          break;
        case "utility":
          let rollData = actor.getCommonRollData()
          rollData.spellCost = Avd12Utility.getSpellCost(actSpell);
          rollData.mode = "spell"
          rollData.spell = actSpell
          if(rollData.spellCost > totalFocusPoints)
            rollData.nen = true;
          else
            if(actor.type == "npc" && !actorLink)
              token.document.delta.update({ 'system.focus.currentfocuspoints':  token.document.delta.system.focus.currentfocuspoints - rollData.spellCost});
            else
              actor.update({ 'system.focus.currentfocuspoints':  actor.system.focus.currentfocuspoints - rollData.spellCost});
          let msg = await Avd12Utility.createChatWithRollMode(rollData.alias, {
            content: await renderTemplate(`systems/avd12/templates/chat/chat-utility-spell.hbs`, rollData)
          })
          break;
        case "damage":
          actor.rollSpellDamage(card.dataset.spellId);
          break;
      }
  }

  static async _onChatCardAction(event) {
    event.preventDefault();
      const button = event.currentTarget;
      button.disabled = true;
      const card = button.closest(".avd12-use-action");
      const messageId = card.closest(".message").dataset.messageId;
      const message = game.messages.get(messageId);
      const action = button.dataset.action;
      let actor = await game.actors.get(message.speaker.actor);
     
      const tokenDocument = canvas.tokens.placeables.find(t => t.id === message.speaker.token);
      if (tokenDocument?.document?.actors) {
        tokenDocument.document.actors.forEach(tokenActor =>{
          actor = tokenActor;
        })
      }
      if ( !actor ) {console.log("*AVD12 Error: No Actor*");return};
      if ( !(game.user.isGM || actor.isOwner) ) return;

      let actAction = await actor.getActionById(card.dataset.actionId);
      if(!actAction){console.log("*AVD12 Error: No Action*");return;}
      
      let actorAction = foundry.utils.duplicate(actAction);
      actorAction.type = action;
      actorAction.action = "action";
      switch ( action ) {
        case "action":
          await actor.rollFormula(actorAction, actorAction.system.attack_roll_formula, true);
          break;
        case "utility":
          await actor.rollFormula(actorAction, actorAction.system.utility_roll_formula, true);
          break;
        case "damage":
          await actor.rollFormula(actorAction, actorAction.system.damage_formula, true);
          break;
        case "damage-secondary":
          await actor.rollFormula(actorAction, actorAction.system.secondary_damage_formula, true);
          break;
        case "damage-tertiary":
          await actor.rollFormula(actorAction, actorAction.system.tertiary_damage_formula, true);
          break;
        case "formula":
          await item.rollFormula({event, spellLevel}); 
          break;
        case "check":
          break;
        case "placeTemplate":
          try {
            //await dnd5e.canvas.AbilityTemplate.fromItem(item)?.drawPreview();
          } catch(err) {}
          break;
        case "abilityCheck":
          break;
      }
      button.disabled = false;
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

  async displayActionCard(action, options){
      const token = this.token;
      const templateData = {
        actor: action.actor,
        tokenId: token?.uuid || null,
        action: action,
        data: await action.actor.system,
        labels: action.actor.labels,
        name : action.actor.name, 
        alias:action.actor.name
      };
      const html = await renderTemplate("systems/avd12/templates/chat/chat-use-action.hbs", templateData);
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
      console.log("AVD12 Error : No Spell Found");
    }
   
  }
  
  useAction(actionId){ 
    let action = null;
    if(this.type == "npc"){
      action = this.items.get(actionId);
      if(!action)
        return;
    }else if(this.type == "character"){
      action =  this.getMove(actionId);
      if(action){
        if(action.type == "action"){
          this.updateIn(action._id, action.system.uses.current - 1, 3);
        }else if(action.type == "reaction"){
          this.updateIn(action._id, action.system.uses.current - 1, 2);
        }
      }else{
        return;
      }
    }
    let actionClone = foundry.utils.duplicate(action);
    actionClone.actor = this;
    actionClone.uses = this.findIn(action._id);
    this.displayActionCard(actionClone, {});
  }

  ZREALM_CRAFTS = ["Ammocraft", "Alchemy", "Smithing", "Cooking", "Scribing", "Runecarving", "Engineering"];
  ZREALM_SKILLS = [
    "Academics",
    "Acrobatics",
    "Animals",
    "Arcanum",
    "Athletics",
    "Concentration",
    "Resilience",
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

  rebuildEquipment(){
    let allEquippedItems = this.items.filter(item => item.system.equipped)
    allEquippedItems.forEach(item => {
      this.parseItemSkills(item.system.skills, item.system.craft_skills, item.system.weapon_skills)
      this.parseItemBonuses(item);
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

  parseItemBonuses(item){
    this.system.health.bonus += item.system.bonus.health;
    this.system.movement.walk.value += item.system.bonus.movespeed;
    this.system.bonus.spell.attack += item.system.bonus.spellattack;
    this.system.bonus.spell.damage += item.system.bonus.spelldamage;

    //we are not utilizing power and stuff here... FLAG

    this.system.focus.focuspoints += item.system.bonus.power;
    this.system.focus.focusregen += item.system.bonus.powerregen;
    this.system.focus.burn_chance += item.system.bonus.burnchance;

    //this.system.focus.maxfocuspoints
    //this.system.focus.focuspoints += item.system.focus.focuspointsbonus;
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

    //reset 


    this.system.bonus.weapon.damage = 0;
    this.system.bonus.weapon.attack = 0;
    this.system.health.bonus = 0;
  }

  rebuildSize(){
    switch(Number(this.system.biodata.size)){
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

  rebuildTraits(){
    for (let bonusKey in this.system.bonus) {
      let bonus = this.system.bonus[bonusKey]
      for (let content in bonus) {
        let dataPath = bonusKey + "." + content
        let availableTraits = this.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
        for (let trait of availableTraits) {
          this.tmpTraits.push(trait);
          bonus[content] += Number(trait.system.bonusvalue)
        }
      }
    } 
  }

  rebuildMainTrait(){
    switch (Number(this.system.trait)) {
      case 1: //born adventurer
          //do nothing
          break;
      case 2: //pact bound
          break;
      case 3: //mixed ancestry
          break;
      case 4: //durable
          this.system.health.max += this.system.level.value;
          break;
      case 5: //extra planar
          break;
      case 6: //force sensitive
          break;
    }
  }

  updateIn(id, value, max ){
    for(let i = 0; i < this.system.usages.length; i++){
      if(id == this.system.usages[i].key){
        this.system.usages[i].uses = Math.min(max, Math.max(0, value));
      }
    }
    this.update({ 'system.usages': this.system.usages})
  }

  findIn(id){
    for(let i = 0; i < this.system.usages.length; i++){
      if(id == this.system.usages[i].key){
        return this.system.usages[i];
      }
    }
  }

  addTo(id, value, maxValue){
    for(let i = 0; i < this.system.usages.length; i++){
      if(id == this.system.usages[i].key){
        return;
      }
    }
    this.system.usages.push({key:id, uses: value, max: maxValue}); 
   }

  /* -------------------------------------------- */
  rebuildModules() {
    this.tmpCraftingTraits = [];
    this.tmpTraits = [];
    this.tmpFreeActions = [];
    this.tmpActions = [];
    this.tmpReactions = [];
    this.tmpBallads = [];
    this.tmpStances = [];

    //get loose traits
    let totalTraits= this.items.filter(item => item.type == 'trait')
    totalTraits.forEach(item => {
      switch(item.system.traittype){
        case "skill":
        case "bonus":
        case "mitigation":  
          _.set(this.system, item.system.bonusdata, _.get(this.system, item.system.bonusdata) + item.system.bonusvalue)
          break;
        case "feature":
          //maybe decide what to do here?
          break;
        default:
          break;
      }
    })

    //get traits from modules
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
                    case "elemental":
                      this.system.mitigation.fire.value +=data.system.bonusvalue;
                      this.system.mitigation.cold.value+=data.system.bonusvalue;
                      this.system.mitigation.lightning.value+=data.system.bonusvalue;
                      break;
                      case "allcraft":
                        this.system.bonus.craft.smithing += data.system.bonusvalue
                        this.system.bonus.craft.runecarving += data.system.bonusvalue
                        this.system.bonus.craft.scribing += data.system.bonusvalue
                        this.system.bonus.craft.engineering += data.system.bonusvalue
                        this.system.bonus.craft.cooking += data.system.bonusvalue
                        this.system.bonus.craft.alchemy += data.system.bonusvalue
                        this.system.bonus.craft.ammocraft += data.system.bonusvalue
                        break;
                    case "feature":
                      this.tmpTraits.push(data);
                      //maybe decide what to do here?
                      break;
                    case "crafting":
                      this.tmpCraftingTraits.push(data);
                      break;
                    default:
              
                      break;
                  }
                break;
                case "action":
                  let usages = this.findIn(data._id);
                  if(usages){
                    data.system.uses = {current : usages.uses, max: 3}
                  }else{
                    data.system.uses = {current : 3, max: 3}
                    this.addTo(data._id, 3, 3);
                  }
                  this.tmpActions.push(data);
                  break;
                case "reaction":
                  let reactionUsages = this.findIn(data._id);
                  if(reactionUsages){
                    data.system.uses = {current : reactionUsages.uses, max: 2}
                  }else{
                    data.system.uses = {current : 2, max: 2}
                    this.addTo(data._id, 2, 2);
                  }
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
    this.update({ 'system.usages': this.system.usages })
    return;
  }

  clearData(){
    for (let mitiKey in this.system.mitigation) {
      let mitigation = this.system.mitigation[mitiKey]
      mitigation.value = 0
    }
  }

  /* -------------------------------------------- */
  _preUpdate(changed, options, user) {
    super._preUpdate(changed, options, user);
  }

  
  _onUpdateEmbeddedDocuments( embeddedName, ...args ) {
    super._onUpdateEmbeddedDocuments(embeddedName, ...args)
  }
  

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

  getThrowingEquipment(){
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'equipment' && item.system.quantity > 0 && (item.system.throwtype == "throwable" || item.system.throwtype == "throwing_ammo")) || [])
    comp.forEach(item => {
      this.prepareThrowing(item)
    })
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;
  }

  getEquippedWeapons() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'weapon' && item.system.equipped) || [])
  
    comp.forEach(item => {
      if(item.system.category == "light2h" || item.system.category == "light1h" || item.system.category == "heavy2h" || item.system.category == "heavy1h"){
        item.thrown = true;
      }
    })
   
    comp.forEach(item => {
      this.prepareWeapon(item)
    })
    Avd12Utility.sortArrayObjectsByName(comp)
    return comp;

  }

  parseEquippedGear(){
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'weapon' && item.system.equipped) || [])
    comp.forEach(item => {
      this.prepareWeapon(item)
    })

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

  getLightSources(){
    return foundry.utils.duplicate(this.items.filter(item => item.type == 'equipment' && item.system.light.lightsource));
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

      //check for spell fist
      if(this.system.bonus.traits.spellfist && this.isSpellFistSpell(spell) && this.getSpellFistFocus()){
        spell.system.range = 0;
        spell.system.range_type = "adjacent";
        spell.system.spelltype = "melee attack";
      }

      spell.system.rangeDescription = (spell.system.range > 0 ? spell.system.range : "") + " " + spell.system.range_type.charAt(0).toUpperCase() + spell.system.range_type.substring(1, spell.system.range_type.length);
      spell.system.actionDescription = spell.system.actions + " " + spell.system.action_type.charAt(0).toUpperCase() + spell.system.action_type.slice(1) + (spell.system.actions > 1 ? 's' :'');
      spell.system.improvedDescription = spell.system.description  + (spell.system.chargeEffect ? "\nCharge Effect: " + spell.system.chargeEffect:"")  + (spell.system.components ? "\nComponents: " + spell.system.components : "");  
      spell.system.damageDescription = spell.system.damage + " " + spell.system.damagetype.charAt(0).toUpperCase() + spell.system.damagetype.slice(1)
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
    let comp = foundry.utils.duplicate(spells.filter(item => item.system.level == 'grandmaster') || []);
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

  prepareThrowing(ammo){
    if(ammo.system.throwtype == "throwing_ammo" || ammo.system.throwtype == "throwable"){
      ammo.system.minrange = 2;
      ammo.system.maxrange = Math.max(4, 4 + this.system.attributes.might.skills.athletics.finalvalue);
    }
    let dice = "";
    if(ammo.system.throwtype == "throwing_ammo"){
      dice = "1d6";
      ammo.system.maxrange += 2;
      if(this.system.bonus.traits.deadlythrowing == 1)
        dice = "1d10";
    }

    ammo.system.damages.primary.normal = dice;
    ammo.attackBonus = this.system.attributes.might.skills.athletics.finalvalue;
    ammo.dice = dice;
    this.addPrimaryThrowDamage(ammo.system.damages.primary, this.system.attributes.might.skills.athletics.finalvalue, dice)
  }

  addPrimaryThrowDamage(damage, bonusDamage, dice) {
    if (damage.damagetype != "none" && damage.dice) {
      let fullBonus = Number(bonusDamage) + Number(damage.bonus)
      damage.dice = dice;
      damage.normal = damage.dice + '+' + fullBonus ;
      damage.critical = damage.dice + '+' + Number(fullBonus) * 2;
      let parser = damage.dice.match(/(\d+)(d\d+)/)
      let nbDice = 2
      if (parser && parser[1]) {
        nbDice = Number(parser[1]) * 2
      }
      damage.brutal = nbDice + parser[2] + "+" + (Number(fullBonus) * 2);
    }
  }


/*

  //in progress
  getParsedWeapon(w){
    if(w.type == 'equipable'){
      return;
    }
    let weapon = foundry.utils.duplicate(w);

    //attack bonus = general attack + weapon bonus + character skill bonus
    //weapon.attackBonus = this.system.bonus.weapon.attack + weapon.system.bonus.attack + this.system.bonus[weapon.system.weapontype].attack

    //get all bases
    let weaponDamageBonus = parseInt(this.system.bonus.weapon.damage);  //bonus damage on the weapon
    let weaponDamageDice = Avd12Equipment.getDamageDice(weapon.system,category,this.system.bonus[weapon.system.weapontype].upgraded);
    let weaponAttackBonus = this.system.bonus.weapon.attack + weapon.system.bonus.attack + this.system.bonus[weapon.system.weapontype].attack;
    
    //STANCES::
    //check for dueling stance
    if(this.system.bonus.dueling &&(weapon.system.category == "heavy1h" || weapon.system.category == "light1h") &&!this.items.find(item => item.type == "shield" && item.system.equipped))
      weaponDamageBonus += 2;
    //check for sentinel stance
    else if(this.system.bonus.traits.sentinel == 1 && weapon.system.category == "light2h")
      weaponDamageBonus += this.system.attributes.knowledge.skills.academic.finalvalue;
    //check for juggernaut stance
    else if(this.system.bonus.traits.juggernaut == 1 && (weapon.system.category == "heavy1h" || weapon.system.category == "heavy2h"))
      weaponDamageBonus += 2;
    

    let extraNonCritDice = ""
    let extraNonCritDamage = ""
    //calculate non-crit eligble damage
    if(this.system.bonus.traits.flowingstrikes && weapon.system.category == "unarmed"){
      extraNonCritDice = "+1d4";
    }
  }

  /* -------------------------------------------- */
  prepareWeapon(weapon) {
    if(weapon.type == 'equipable'){
      return;
    }
    if(this.system.bonus.traits.spellsword && weapon.system.focus?.isfocus){
      weapon.attackBonus = this.system.bonus.spell.attack + weapon.system.bonus.attack;
    }else if(weapon.system.weapontype == "custom"){
      weapon.attackBonus = this.system.bonus.weapon.attack + weapon.system.bonus.attack
    }else{
      weapon.attackBonus = this.system.bonus.weapon.attack + weapon.system.bonus.attack + this.system.bonus[weapon.system.weapontype].attack
    }

    let bonusDamage = parseInt(this.system.bonus.weapon.damage);

    
    if(this.system.bonus.dueling){
      let equippedShield = this.items.find(item => item.type == "shield" && item.system.equipped)
      if(!equippedShield){
        bonusDamage += 2;
      }
    }
  
    let upgraded = 0;
    let dice = "";
    let thrownDice = "";
    if(weapon.system.weapontype != "custom"){
      upgraded = this.system.bonus[weapon.system.weapontype].upgraded;
    }

    if(this.type == "npc"){
      weapon.attackBonus = this.system.bonus.npc.attack_accuracy + weapon.system.bonus.attack;
      bonusDamage = this.system.bonus.npc.attack_power;
    }

    switch(weapon.system.category){
      case "custom":
        dice = weapon.system.damages.primary.dice;
        break;
      case "unarmed":
        upgraded == 1 ?  (this.system.level.value >= 9? dice = "2d8" : dice = "1d10") : dice = "1d6"
      break;
      case "light1h":
        weapon.system.thrown = true;
        if(this.system.bonus.traits.dueling == 1)
          bonusDamage += 2
        upgraded == 1 ? dice = "2d6" : dice = "1d8"
        break;
      case "heavy1h":
        if(this.system.bonus.traits.dueling == 1)
          bonusDamage += 2
        if(this.system.bonus.traits.juggernaut == 1)
          bonusDamage += 2
        weapon.system.thrown = true;
        upgraded == 1 ? dice = "2d8" : dice = "1d10"
        break;
      case "light2h":
        weapon.system.thrown = true;
        upgraded == 1 ? dice = "3d6" : dice = "3d4"
        break;
      case "heavy2h":
        if(this.system.bonus.traits.juggernaut == 1)
          bonusDamage += 2
        weapon.system.thrown = true;
        upgraded == 1 ? dice = "3d8" : dice = "2d8"
        break;
      case "ulightranged":
        upgraded == 1 ? dice = "1d10" : dice = "1d6"
        break;
      case "lightranged":
        upgraded == 1 ? dice = "2d6" : dice = "2d4"
        break;
      case "heavyranged":
        upgraded == 1 ? dice = "3d6" : dice = "2d6"
        break;
    }
    if(weapon.system.damages.primary.dice == "1d4"){
      weapon.system.thrown = false;
    }

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
      case "light1h":
      case "light2h":
        if(weapon.system.thrown){
        weapon.system.minrange = 2;
        weapon.system.maxrange = Math.max(4, 4 + this.system.attributes.might.skills.athletics.finalvalue);
        if(this.system.bonus.traits.quicktoss)
          this.system.bonus.traits.chucker == 1 ? thrownDice = "2d8" : thrownDice = "2d6"         
        else
          this.system.bonus.traits.chucker == 1 ? thrownDice = "1d8" : thrownDice = "1d6"
        if(this.system.bonus.traits.skilledchucking && weapon.attackBonus + 4 > weapon.system.maxrange)
          weapon.system.maxrange = weapon.attackBonus + 4;
        break;
        }
      case "heavy1h":
      case "heavy2h":
        if(weapon.system.thrown){
          weapon.system.minrange = 2;
          weapon.system.maxrange = Math.max(0, 1 + this.system.attributes.might.skills.athletics.finalvalue);
          if(this.system.bonus.traits.skilledchucking && weapon.attackBonus + 1 > weapon.system.maxrange)
            weapon.system.maxrange = weapon.attackBonus + 1;
          if(this.system.bonus.traits.quicktoss)
            this.system.bonus.traits.chucker == 1 ? thrownDice = "2d12" : thrownDice = "2d8"
          else
            this.system.bonus.traits.chucker == 1 ? thrownDice = "1d12" : thrownDice = "1d8"
          break;
        }
    } 
    
  if(weapon.system.minrange < 0)
    weapon.system.minrange = 0;
  if(weapon.system.damages.primary.dice == "1d4"){
    this.thrown = false;
    this.addPrimaryDamage(weapon.system.damages.primary, bonusDamage, "1d4", "")
    this.addOtherDamage(weapon.system.damages.secondary, bonusDamage)
    this.addOtherDamage(weapon.system.damages.tertiary, bonusDamage)
  }else{
    let extraDamage = "";
    if(this.system.bonus.traits.flowingstrikes && weapon.system.category == "unarmed")
      extraDamage = "+1d4";
      
    weapon.dice = dice;
    weapon.extraDamage = extraDamage;

    weapon.critEligble =  bonusDamage + (weapon.system.category == "custom" ? 0 :this.system.bonus[weapon.system.weapontype].damage) + parseInt(weapon.system.damages.primary.bonus);
    let calculatedDamage = bonusDamage + (weapon.system.category == "custom" ? 0 :this.system.bonus[weapon.system.weapontype].damage);

    if(this.system.bonus.traits.spellsword && weapon.system.focus?.isfocus){
      weapon.critEligble =  bonusDamage + this.system.bonus.spell.damage + parseInt(weapon.system.damages.primary.bonus);
      calculatedDamage = bonusDamage + this.system.bonus.spell.damage;
    }

    if(this.system.bonus.traits.sentinel == 1 && weapon.system.category == "light2h")
      calculatedDamage = this.system.attributes.knowledge.skills.academic.finalvalue + bonusDamage;
    
    
    this.addPrimaryDamage(weapon.system.damages.primary, calculatedDamage, dice, extraDamage)
    
    if(weapon.system.thrown){
      if(this.system.bonus.traits.spellsword && weapon.system.focus?.isfocus){
        this.addPrimaryThrownDamage(weapon.system.damages.primary, bonusDamage + this.system.bonus.spell.damage, thrownDice, "")
      }else{
        this.addPrimaryThrownDamage(weapon.system.damages.primary, bonusDamage + this.system.bonus[weapon.system.weapontype].damage, thrownDice, "")

      }
      weapon.throwndice = thrownDice;
  
    }

    this.addOtherDamage(weapon.system.damages.secondary, bonusDamage)
    this.addOtherDamage(weapon.system.damages.tertiary, bonusDamage)
  }
  }
  /* -------------------------------------------- */
  getItemById(id) {
    let item = this.items.find(item => item.id == id);
    if (item) {
      item = foundry.utils.duplicate(item)
    }
    return item;
  }

  getStances(){
    let originalStances = foundry.utils.duplicate(this.items.filter(item => item.type == 'stance') || [])
    let combinedStances = originalStances.concat(this.tmpStances);
    return combinedStances;
  }

  /* -------------------------------------------- */
  getModules() {
    let comp = foundry.utils.duplicate(this.items.filter(item => item.type == 'module') || [])
    return comp
  }
  getTraits() {
    return this.tmpTraits;
  }

  getCraftingTraits(){
    return this.tmpCraftingTraits;
  }

  getFreeActions(){
    return this.tmpFreeActions;
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

  async getActionById(id){
    if(this.type == "character"){
      for(let i in this.tmpActions){
        if(this.tmpActions[i]._id == id){
          return this.tmpActions[i];
        }
      }
    }else if(this.type == "npc"){
      return this.items.get(id);
    }
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

  /* ------------------------------------------- */
  async buildContainerTree() {
    let equipments = foundry.utils.duplicate(this.items.filter(item => item.type == "equipment") || [])
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



  /* -------------------------------------------- */
  syncRoll(rollData) {
    this.lastRollId = rollData.rollId;
    Avd12Utility.saveRollData(rollData);
  }

  /* -------------------------------------------- */
  getOneSkill(skillId) {
    let skill = this.items.find(item => item.type == 'skill' && item.id == skillId)
    if (skill) {
      skill = foundry.utils.duplicate(skill);
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
    /*
    let attr = this.system.attributes[attrKey]
    let skill = attr.skills[skillKey]
    if (skill) {
      skill = foundry.utils.duplicate(skill)
      skill.name = Avd12Utility.upperFirst(skillKey)
      skill.attr = foundry.utils.duplicate(attr)
      let rollData = this.getCommonRollData()
      rollData.modifier = this.system.bonus[weapon.system.weapontype]
      rollData.mode = "weapon"
      rollData.weapon = weapon
      rollData.img = weapon.img
      rollData.conditions = this.system.conditions;  
      this.startRoll(rollData, skipDialog)

    } else {
      ui.notifications.warn("Unable to find the relevant weapon ")
    }

    */
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
      rollData.img = skill.img
      this.startRoll(rollData, skipDialog)
    }
  }

  rollCrafting(craftKey) {
    let craft = {skill : this.system.bonus.craft[craftKey]};
    craft.name = Avd12Utility.upperFirst(craftKey)
    let rollData = this.getCommonRollData()
    rollData.mode = "craft"
    rollData.crafting = craft;
    rollData.title = "Roll Skill " + craft.name 
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

  async changeStance(stanceId){
    this.items.forEach(async item => {
      if(item.type == "stance"){   
        item.system.active = false;
        await this.updateEmbeddedDocuments("Item", [{ _id: item.id, 'system.active': false }]);
      }
    })
    let stance = this.items.get(stanceId);
    stance.system.active = true;
    await this.updateEmbeddedDocuments("Item", [{ _id: stance.id, 'system.active': true }]);
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
    }
  
  async rollSpellDamage(spellId) {
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

  /* -------------------------------------------- */
  rollWeapon(weaponId, skipDialog) {

    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = foundry.utils.duplicate(weapon)
      this.prepareWeapon(weapon) 
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
      weapon = foundry.utils.duplicate(weapon)
      this.prepareThrowing(weapon)
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
  

  /* -------------------------------------------- */
  async rollSecondaryWeaponDamage(weaponId) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = foundry.utils.duplicate(weapon)
      this.prepareWeapon(weapon)
      let rollData = this.getCommonRollData()
      rollData.damageFormula = weapon.system.damages.secondary["normal"]
      rollData.mode = "weapon-damage"
      rollData.weapon = weapon
      rollData.damageType = weapon.system.damages.secondary.damagetype
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

  async rollTertiaryWeaponDamage(weaponId) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = foundry.utils.duplicate(weapon)
      this.prepareWeapon(weapon)
      let rollData = this.getCommonRollData()
      rollData.damageFormula = weapon.system.damages.tertiary["normal"]
      rollData.mode = "weapon-damage"
      rollData.weapon = weapon
      rollData.damageType = weapon.system.damages.tertiary.damagetype
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
      if(id == this.tmpActions[i]._id)
        return this.tmpActions[i];
    }
    for(let i = 0; i < this.tmpReactions.length; i++){
      if(id == this.tmpReactions[i]._id)
      return this.tmpReactions[i];
    }
    for(let i = 0; i < this.tmpFreeActions.length; i++){
      if(id == this.tmpFreeActions[i]._id)
      return this.tmpFreeActions[i];
    }
    for(let i = 0; i < this.tmpBallads.length; i++){
      if(id == this.tmpBallads[i]._id)
      return this.tmpBallads[i];
    }
  }


  async rollWeaponDamage(userData, weapon){
    let baseDice = ""
    if(weapon.hitType == "normal"){
      baseDice = weapon.dice;
    }else if(weapon.hitType == "thrown"){
      baseDice = weapon.throwndice;
    }else if(weapon.hitType == "throw"){
     
      baseDice = weapon.dice;
    }else{
    }
    if(!weapon.extraDamage){weapon.extraDamage = 0}
    let formula = "";

    switch(userData.hitType){
      case "normal":
        if(weapon.hitType == "throw")
          formula = baseDice + "+" + this.system.attributes.might.skills.athletics.finalvalue;
        else
          formula = baseDice + "+" + weapon.critEligble + (weapon.extraDamage != 0 ? "+" + weapon.extraDamage  : "") + (userData.extraDamage == "" ? "" : "+" + userData.extraDamage );
        break;
      case "critical":
        if(weapon.hitType == "throw")
          formula = baseDice + "+" + (this.system.attributes.might.skills.athletics.finalvalue * 2);
        else
          formula = baseDice + "+" + (weapon.critEligble * 2)+ (weapon.extraDamage != 0 ? "+" + weapon.extraDamage  : "") + (userData.extraDamage == "" ? "" : "+" + userData.extraDamage );
        break;
      case "brutal":
        let coef = Number(baseDice.split('d')[0]) * 2 + "d" + baseDice.split('d')[1];
        if(weapon.hitType == "throw")
          formula = coef + "+" + (this.system.attributes.might.skills.athletics.finalvalue * 2);
        else
          formula = coef + "+" + (weapon.critEligble * 2)  + (weapon.extraDamage != 0 ? "+" + weapon.extraDamage  : "") + (userData.extraDamage == "" ? "" : "+" + userData.extraDamage );
        break;
      case "halved":
        break;
      case "nobonus":
          formula = baseDice;
        break; 
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
      let weapon = this.items.get(weaponId)
      if(!weapon)
        return;
      if(hitType == "throw"){
        this.prepareThrowing(weapon)
      }else{
        this.prepareWeapon(weapon) 
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

  async takeBreather(){
    this.system.usages.forEach(use => {
      use.uses = use.max;
    })
    let restData = {};
    restData.actor = this;
    restData.breather = true;
    this.update({ 'system.usages': this.system.usages})
    Avd12Utility.createRestChatMessage(restData);

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
    this.system.usages.forEach(use => {
      use.uses = use.max;
    })

    let currentHealth = this.system.health.value;
    let currentPower = this.system.focus.currentfocuspoints;

    this.system.health.value = Math.min(this.system.health.max, (totalHealthRegen + this.system.health.value))
    this.system.focus.currentfocuspoints = Math.min(this.system.focus.focuspoints, (totalPowerRegen + this.system.focus.currentfocuspoints))
    this.update({ 'system.health.value': this.system.health.value})
    this.update({ 'system.usages': this.system.usages})
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
