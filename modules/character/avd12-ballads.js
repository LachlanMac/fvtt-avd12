export async function changeBallad(actor, stanceId){
    let stance = actor.items.get(stanceId);
    await stance.update({'system.active': !stance.system.active})
  }
