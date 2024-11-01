export function useAction(actor, actionId){ 
    let action = null;
    if(actor.type == "npc"){
      action = actor.items.get(actionId);
      if(!action)
        return;
    }else if(actor.type == "character"){
      action =  actor.getMove(actionId);
      if(action){
        if(action.type == "action"){
          actor.updateIn(action._id, action.system.uses.current - 1, 3);
        }else if(action.type == "reaction"){
          actor.updateIn(action._id, action.system.uses.current - 1, 2);
        }
      }else{
        return;
      }
    }
    let actionClone = foundry.utils.duplicate(action);
    actionClone.actor = actor;
    actionClone.uses = actor.findActionUsages(action._id);
    actor.displayActionCard(actionClone, {});
  }

  export function updateActionUsages(actor, id, value, max ){
    for(let i = 0; i < actor.system.usages.length; i++){
      if(id == actor.system.usages[i].key){
        actor.system.usages[i].uses = Math.min(max, Math.max(0, value));
      }
    }
    actor.update({ 'system.usages': actor.system.usages})
  }

  export function findActionUsages(actor, id){
    for(let i = 0; i < actor.system.usages.length; i++){
      if(id == actor.system.usages[i].key){
        return actor.system.usages[i];
      }
    }
  }

  export function addActionUsage(actor, id, value, maxValue){
    for(let i = 0; i < actor.system.usages.length; i++){
      if(id == actor.system.usages[i].key){
        return;
      }
    }
    actor.system.usages.push({key:id, uses: value, max: maxValue}); 
   }