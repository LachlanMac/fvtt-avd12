export class Avd12ChatBinds {

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

}