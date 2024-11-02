

import { Avd12Utility } from "../avd12-utility.js";
import {parseOption} from "./avd12-option-parser.js";

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

  export function rebuildModules2(actor) {
    
    actor.tmpFreeActions = [];
    actor.tmpActions = [];
    actor.tmpReactions = [];
    actor.tmpBallads = [];
    actor.tmpStances = [];

    let modules = actor.items.filter(item => item.type == "avd12module");
    modules.forEach(module => {
        Object.entries(module.system.options).forEach(([key, option]) => {
            if (option.selected) {
                const optionKey = key.replace("option_", "");
                option.avd12_id = `${module.system.avd12_id}_${optionKey}`;
                console.log(option.avd12_id);
                parseOption(actor, option);
            }
        });
    });
}



  export function rebuildModules(actor) {
    actor.tmpCraftingTraits = [];
    actor.tmpTraits = [];
    actor.tmpFreeActions = [];
    actor.tmpActions = [];
    actor.tmpReactions = [];
    actor.tmpBallads = [];
    actor.tmpStances = [];

    //get loose traits
    let totalTraits= actor.items.filter(item => item.type == 'trait')
    totalTraits.forEach(item => {
      switch(item.system.traittype){
        case "skill":
        case "bonus":
        case "mitigation":  
          _.set(actor.system, item.system.bonusdata, _.get(actor.system, item.system.bonusdata) + item.system.bonusvalue)
          break;
        case "feature":
          //maybe decide what to do here?
          break;
        default:
          break;
      }
    })

    //get traits from modules
    let totalModules = actor.items.filter(item => item.type == 'module')
    totalModules.forEach(item => {
      let levels = item.system.levels;
      levels.forEach(level =>{
        level.choices.forEach(choice => {
          if(choice.selected){
            let features = choice.features;
            for (var prop in features) {
              let data = features[prop];
              switch(data.type){
                case "trait" :
                 
                  switch(data.system.traittype){
                    case "skill":
                    case "bonus":
                    case "mitigation":
                      _.set(actor.system, data.system.bonusdata, _.get(actor.system, data.system.bonusdata) + data.system.bonusvalue)
                      break;
                    case "elemental":
                      actor.system.mitigation.fire.value +=data.system.bonusvalue;
                      actor.system.mitigation.cold.value+=data.system.bonusvalue;
                      actor.system.mitigation.lightning.value+=data.system.bonusvalue;
                      break;
                      case "allcraft":
                        actor.system.bonus.craft.smithing += data.system.bonusvalue
                        actor.system.bonus.craft.runecarving += data.system.bonusvalue
                        actor.system.bonus.craft.scribing += data.system.bonusvalue
                        actor.system.bonus.craft.engineering += data.system.bonusvalue
                        actor.system.bonus.craft.cooking += data.system.bonusvalue
                        actor.system.bonus.craft.alchemy += data.system.bonusvalue
                        actor.system.bonus.craft.ammocraft += data.system.bonusvalue
                        break;
                    case "feature":
                      actor.tmpTraits.push(data);
                      //maybe decide what to do here?
                      break;
                    case "crafting":
                      actor.tmpCraftingTraits.push(data);
                      break;
                    default:
              
                      break;
                  }
                break;
                case "action":
                  let usages = actor.findActionUsages(data._id);
                  if(usages){
                    data.system.uses = {current : usages.uses, max: 3}
                  }else{
                    data.system.uses = {current : 3, max: 3}
                    actor.addTo(data._id, 3, 3);
                  }
                  actor.tmpActions.push(data);
                  break;
                case "reaction":
                  let reactionUsages = actor.findActionUsages(data._id);
                  if(reactionUsages){
                    data.system.uses = {current : reactionUsages.uses, max: 2}
                  }else{
                    data.system.uses = {current : 2, max: 2}
                    actor.addTo(data._id, 2, 2);
                  }
                  actor.tmpReactions.push(data);
                  break;  
                case "freeaction":
                  actor.tmpFreeActions.push(data);
                  break;
                case "ballad":
                  actor.tmpBallads.push(data);
                  break;
                case "feature":
                  actor.tmpTraits.push(data);
                  break;
                break;
              default:
                break;
              }
            }
          }
        })
      })
    })
    actor.update({ 'system.usages': actor.system.usages })
    return;
  }