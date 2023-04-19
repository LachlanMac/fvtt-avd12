import { Avd12Utility } from "./avd12-utility.js";


/* -------------------------------------------- */
export class Avd12Combat extends Combat {
  
  /* -------------------------------------------- */
  async rollInitiative(ids, formula = undefined, messageOptions = {} ) {
    ids = typeof ids === "string" ? [ids] : ids;
    for (let cId = 0; cId < ids.length; cId++) {
      const c = this.combatants.get(ids[cId]);
      let id = c._id || c.id;
      let initBonus = c.actor ? c.actor.getInitiativeScore( this.id, id ) : -1;

      let formula = "1d12+";
      if(c.actor.system.universal.skills.initiative.good){
        formula = "3d4+";
      }
      
      let initRoll = new Roll(formula + initBonus).roll({ async: false })
      await Avd12Utility.showDiceSoNice(initRoll, game.settings.get("core", "rollMode"));
      await this.updateEmbeddedDocuments("Combatant", [ { _id: id, initiative: initRoll.total } ]);

      formula += initBonus;
      initRoll.bonusMalusRoll = initBonus;
      initRoll.skill = c.actor.system.universal.skills.initiative;
      initRoll.diceFormula = formula;
  
      await Avd12Utility.createChatWithRollMode(initRoll.alias, {
        content: await renderTemplate(`systems/fvtt-avd12/templates/chat/chat-initiative-result.hbs`, initRoll)
      })


    }
    return this;
  }

  /* -------------------------------------------- */
  _onUpdate(changed, options, userId) {
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
