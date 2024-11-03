import { Avd12Utility } from "../avd12-utility.js";

export function rebuildNPCSkills(actor) {
    let armorPenalties = Avd12Utility.getArmorPenalty(actor.items.find(item => item.type == "armor"))
    let shieldPenalties = Avd12Utility.getArmorPenalty(actor.items.find(item => item.type == "shield"))

    for (let attrKey in actor.system.attributes) {
      let attr = actor.system.attributes[attrKey]
      for (let skillKey in attr.skills) {
        let dataPath = attrKey + ".skills." + skillKey + ".modifier"
        let skill = attr.skills[skillKey]

        //SOFT RESET
        if(actor.system.imported == 0)
          skill.modifier = 0
      
        let availableTraits = actor.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
        for (let trait of availableTraits) {
          skill.modifier += Number(trait.system.bonusvalue)
        }
        // Apply armor penalties
        if (armorPenalties[skillKey]) {
          skill.modifier += Number(armorPenalties[skillKey])
        }
        // Apply shield penalties
        if (shieldPenalties[skillKey]) {
          skill.modifier += Number(shieldPenalties[skillKey])
        }
        // Process additionnal bonuses
        for (let item of actor.items) {
          if (item.system.bonus && item.system.bonus[skillKey]) {
            skill.modifier += Number(item.system.bonus[skillKey].value)
          }
        }
        skill.finalvalue = skill.modifier + attr.value
      }
    }
    //the master formula for sizes
      switch(Number(actor.system.biodata.size)){
        case 1: 
          actor.system.attributes.agility.skills.dodge.finalvalue += 2; 
          actor.system.attributes.might.skills.block.finalvalue -= 2; 
          break;
        case 2: 
          actor.system.attributes.agility.skills.dodge.finalvalue += 1; 
          actor.system.attributes.might.skills.block.finalvalue -= 1;
          break;
        case 3: 
          break;
        case 4:  
          actor.system.attributes.agility.skills.dodge.finalvalue -= 1; 
          break;
        case 5: 
          actor.system.attributes.agility.skills.dodge.finalvalue -= 2; 
          actor.system.attributes.might.skills.block.finalvalue -= 1;
          break;
        case 6: 
          actor.system.attributes.agility.skills.dodge.finalvalue -= 2; 
          actor.system.attributes.might.skills.block.finalvalue -= 2;
          break;
      }

    for (let skillKey in actor.system.universal.skills) {
      let skill = actor.system.universal.skills[skillKey]
      skill.finalvalue = 0;
      let dataPath = "universal.skills." + skillKey + ".modifier"
      let availableTraits = actor.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
      for (let trait of availableTraits) {
        skill.modifier += Number(trait.system.bonusvalue)
      } 
      skill.finalvalue = skill.modifier; 
    }
    
    for(let mitiKey in actor.system.mitigation){
      if(actor.system.imported == 0)
        actor.system.mitigation[mitiKey].value = 0;
    }
    
    for(let mitiKey in actor.system.mitigation){
      let dataPath = "mitigation." + mitiKey + ".value"
      let availableTraits = actor.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == dataPath)
      for (let trait of availableTraits) {
        actor.system.mitigation[mitiKey].value += Number(trait.system.bonusvalue)
      }
    }

    let availableTraits = actor.items.filter(t => t.type == "trait" && t.system.computebonus && t.system.bonusdata == "mitigation.elemental.value")
    for (let trait of availableTraits) {
      actor.system.mitigation.cold.value += Number(trait.system.bonusvalue)
      actor.system.mitigation.fire.value += Number(trait.system.bonusvalue)
      actor.system.mitigation.lightning.value += Number(trait.system.bonusvalue)
    }
  }
