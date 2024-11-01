

import { Avd12Utility } from "../avd12-utility.js";

export function getMinimumModulePoints(actor) {
    let minPoints = 0;
    let modules = actor.items.filter(item => item.type === "avd12module");
    modules.forEach(module => {
      minPoints += actor.getSpentModulePoints(module);
    });
    return minPoints;
}

export async function updateModulePoints(actor, delta) {
    let modulePoints = actor.getTotalModulePoints() + delta;
    let level = Math.floor((modulePoints - (actor.system.born_adventurer ? 4 : 0)) / 8);

    if (level !== actor.system.level.value) {
        await actor.update({ "system.level.value": level });
    }
    await actor.update({ "system.module_points": actor.system.module_points + delta });
}

export function getTotalModulePoints(actor){
    let totalPoints = 0;
    let modules = actor.items.filter(item => item.type == "avd12module");
    modules.forEach(module =>{
      totalPoints+=actor.getSpentModulePoints(module);
    });
    return totalPoints + actor.system.module_points;
  }

export function getSpentModulePoints(module) {
    let cost = 0;
    if (module.system.options && typeof module.system.options === 'object') {
      Object.entries(module.system.options).forEach(([location, option]) => {
        if (option.selected) {
          if (module.system.origin && location === "option_1") {
          } else {
            cost += option.cost;
          }
        }
      });
    }
    return cost;
  }
  

export async function updateModuleSelection(actor, item, location, selection){

    let module = actor.items.filter(found => found._id == item._id);
    if(module){
      if(!Avd12Utility.isValidModuleOption(item,location)){
        return;
      }
      let option = item.system.options[location];
      let oppositeLocation = Avd12Utility.GetOtherTier(location);
      if(selection){
        item.system.options[location].selected = false;
        await Promise.all([
          actor.updateModulePoints(option.cost),
          item.update({ "system.options": item.system.options })
        ]);
        return;
      }
      if(oppositeLocation){
          if(item.system.options[oppositeLocation].selected){
            item.system.options[location].selected = true;
            item.system.options[Avd12Utility.GetOtherTier(location)].selected = false;
            await item.update({ "system.options": item.system.options })
            return;
          }
      }
      if(actor.system.module_points >= option.cost){
        item.system.options[location].selected = true;
        await Promise.all([
          actor.updateModulePoints(-option.cost),
          item.update({ "system.options": item.system.options })
        ]);
        return;
      }
    else{
      ui.notifications.warn("Could not find the module");
    }
  }
  } 