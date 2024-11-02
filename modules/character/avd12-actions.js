export async function useAction(actor, actionId) { 
  let action = null;
  if (actor.type === "npc") {
      action = actor.items.get(actionId);
  } else if (actor.type === "character") {
      action = actor.getMove(actionId);
      if (action) {
          if (action.type === "action") {
              await updateActionUsages(actor, action.system.avd12_id, action.system.uses.current - 1, 3);
          } else if (action.type === "reaction") {
              await updateActionUsages(actor, action.system.avd12_id, action.system.uses.current - 1, 2);
          }
      }
  }
  if (!action) return;

  const actionClone = foundry.utils.duplicate(action);
  actionClone.actor = actor;
  actionClone.uses = findActionUsages(actor, action.system.avd12_id);
  actor.displayActionCard(actionClone, {});
}

export async function updateActionUsages(actor, id, value, max) {
  const usage = findActionUsages(actor, id);
  if (usage) {
      usage.uses = Math.min(max, Math.max(0, value));
      await actor.update({ 'system.usages': actor.system.usages });
  }
}

export function findActionUsages(actor, id) {
  let x = actor.system.usages.find(usage => usage.key === id)
  return x;
}

export async function addActionUsage(actor, id, value, maxValue) {
  if (!findActionUsages(actor, id)) {
      actor.system.usages.push({ key: id, uses: value, max: maxValue });
      await actor.update({ 'system.usages': actor.system.usages });
  }
}
