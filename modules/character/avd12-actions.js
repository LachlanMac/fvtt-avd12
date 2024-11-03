
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
  actor.displayActionCard(actionClone, {});
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