
export async function useAction(actor, actionId) { 
  let action = null;
  if (actor.type === "npc") {
      action = actor.items.get(actionId);
  } else if (actor.type === "character") {
      action = actor.items.find(item => item._id === actionId) || null
      if (action) {
          if (action.type === "action") {
             await action.update({"system.uses.current":Math.max(0, action.system.uses.current - 1)});
          } else if (action.type === "reaction") {
            await action.update({"system.uses.current":Math.max(0, action.system.uses.current - 1)});
          }
      }
  }
  if (!action) return;
  const actionClone = foundry.utils.duplicate(action);
  actionClone.actor = actor;
  displayActionCard(actor, actionClone, {});
}


async function displayActionCard(actorRef, action, options){
    const token = actorRef.token;
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
      speaker: ChatMessage.getSpeaker({actor: actorRef, token}),
      flags: {"core.canPopout": true}
    };
    Hooks.callAll("avd12.preDisplayCard", actorRef, chatData, options);
    ChatMessage.applyRollMode(chatData, options.rollMode ?? game.settings.get("core", "rollMode"));
    const card = (options.createMessage !== false) ? await ChatMessage.create(chatData) : chatData;
    Hooks.callAll("avd12.displayCard", actorRef, card);
}


export async function resetActions(actor, day){
  const updates = [];
  for (const action of actor.items) {
      if (["action", "reaction"].includes(action.type)) {
          if (!day && action.system.daily) continue;
          updates.push({
              _id: action.id,
              "system.uses.current": action.system.uses.max
          });
      }
  }
  
  if (updates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", updates);
  }
  console.logAVD12(`Actions reset for ${actor.name}. Day reset: ${day}`);

}