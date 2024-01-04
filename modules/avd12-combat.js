import { Avd12Utility } from "./avd12-utility.js";


/* -------------------------------------------- */
export class Avd12Combat extends Combat {
  

  /* -------------------------------------------- */
  async rollInitiative(ids, formula = undefined, messageOptions = {} ) {


    ids = typeof ids === "string" ? [ids] : ids;
    for (let cId = 0; cId < ids.length; cId++) {
      const c = this.combatants.get(ids[cId]);
      let id = c._id || c.id;
  
      
      let initTotal = c.actor.system.universal.skills.initiative.finalvalue;
      if(c.actor.system.universal.skills.initiative.good){
        initTotal+=2;
      }
      //let initRoll = new Roll(formula + initBonus).roll({ async: false })
      let initRoll = {total:initTotal}

      //cheese to allow characters to break ties.
      if(c.actor.type == "character"){
        initTotal += 0.001;
      }

      //await this.updateEmbeddedDocuments("Combatant", [ { _id: id, initiative: initRoll.total } ]);
      await this.updateEmbeddedDocuments("Combatant", [ { _id: id, initiative: initTotal } ]);

      //formula += initBonus;
      //initRoll.bonusMalusRoll = initBonus;
      initRoll.skill = c.actor.system.universal.skills.initiative;
      initRoll.name = c.actor.name;
      //initRoll.diceFormula = formula;
  
      await Avd12Utility.createChatWithRollMode(initRoll.alias, {
        content: await renderTemplate(`systems/avd12/templates/chat/chat-initiative-result.hbs`, initRoll)
      })


    }
    return this;
  }


  /* -------------------------------------------- */
  static async checkTurnPosition() {
    while (game.combat.turn > 0) {
      await game.combat.previousTurn()
    }
  }

  /* -------------------------------------------- */
  _onDelete() {
    let combatants = this.combatants.contents
    for (let c of combatants) {
      let actor = game.actors.get(c.actorId)
      actor.clearInitiative()
    }
    super._onDelete()
  }

}
