import { Avd12Utility } from "./avd12-utility.js";

export class Avd12Combat extends Combat {
  /**
   * Rolls initiative for one or more combatants in the combat.
   * @param {Array|string} ids - A single combatant id or an array of combatant ids to roll initiative for.
   * @param {string} [formula=undefined] - A custom formula for rolling initiative. Not used in this implementation.
   * @param {Object} [messageOptions={}] - Additional options for the message. Not used in this implementation.
   * @returns {Promise<Avd12Combat>} - A promise that resolves with the Avd12Combat instance once initiative has been rolled for all provided combatants.
   */

  
  async rollInitiative(ids, formula = undefined, messageOptions = {} ) {
    ids = typeof ids === "string" ? [ids] : ids; // Ensure 'ids' is an array.
    for (let cId = 0; cId < ids.length; cId++) {
      const c = this.combatants.get(ids[cId]);
      let id = c._id || c.id;
      let initTotal = c.actor.system.universal.skills.initiative.finalvalue; // Base initiative total from actor's initiative skill.
      // If the character is proficient with initiative, add +2 according to AVD12 rules.
      if(c.actor.system.universal.skills.initiative.good)
        initTotal += 2;
      let initRoll = {total: initTotal}
      await this.updateEmbeddedDocuments("Combatant", [{ _id: id, initiative: initTotal }]); // Update initiative for the combatant.
      //if the token is hidden, do not show it entering combat
      if(c.token.hidden)
        return;
      // Prepare data for the chat card.
      initRoll.skill = c.actor.system.universal.skills.initiative;
      initRoll.name = c.actor.name;
      initRoll.img = c.img;
      // Create a chat message with the roll result.
      await Avd12Utility.createChatWithRollMode(initRoll.alias, {
        content: await renderTemplate(`systems/avd12/templates/chat/chat-initiative-result.hbs`, initRoll)
      });
    }
    return this;
  }

  static async checkTurnPosition() {
    while (game.combat.turn > 0) {
      await game.combat.previousTurn();
    }
  }
  
  /**
   * Automatically rolls initiative for any new combatants entering the combat.
   * @override
   */
  _onCreateDescendantDocuments(embeddedName, collection, documents, data, options, userId) {
    super._onCreateDescendantDocuments(embeddedName, collection, documents, data, options, userId);
    documents.forEach(document => {
      this.rollInitiative(document._id); // Roll initiative for each new document (combatant).
    });
  }
  
  /**
   * Overrides the default sort function for combatants to ensure that players win ties against NPCs.
   * @override
   * @param {Combatant} combatantA - The first combatant.
   * @param {Combatant} combatantB - The second combatant.
   * @returns {number} - The sort order (-1, 0, 1).
   */
  _sortCombatants(combatantA, combatantB){
    let a = combatantA.initiative;
    let b = combatantB.initiative;
    if(a > b) return -1;
    else if(a < b) return 1;
    else {
      if(combatantA.actor.type == "character" && combatantB.actor.type == "npc") return -1;
      else if(combatantA.actor.type == "npc" && combatantB.actor.type == "character") return 1;
      else return 0;
    }
  }
  
  /**
   * Cleans up initiative values for all combatants upon deleting the combat instance.
   * @override
   */
  _onDelete() {
    let combatants = this.combatants.contents;
    for (let c of combatants) {
      let actor = game.actors.get(c.actorId);
      actor.clearInitiative(); // Clear initiative for each actor.
    }
    super._onDelete();
  }
}