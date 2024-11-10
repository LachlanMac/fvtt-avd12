

import {AVD12CharacterCreatorDialog} from "../dialog/avd12-character-creator-dialog.js"


export async function confirmCreateCharacter(actor, data){
    let system = actor.system;
    system.origin_trait = data.origin;
    system.biodata.size = data.size;

    const combinedArray = [...data.ancestries.values(), ...data.planar.values(), ...data.alteration.values()];
    // Find the primary module in the combinedArray by matching _id
    const primaryModule = combinedArray.find(module => module._id === data.primary._id);
  
    if(!primaryModule){
      console.error("Could not create character : missing module");
      return;
    }
    let modulesToAdd = [];
    modulesToAdd.push(primaryModule);
    switch(data.origin){
      case 1:
        system.module_points += 4;
        break;
      case 2://PACT
        const pactModule = combinedArray.find(module => module.name.toLowerCase() === "pact");
        if(!pactModule){
          console.error("Could not create character : missing module");
        }
        modulesToAdd.push(pactModule);
        break;
      case 3://mixed module
      case 4://planar module
        const secondaryModule = combinedArray.find(module => module._id === data.secondary._id);
        if(!secondaryModule){
          console.error("Could not create character : missing module");
        }
        modulesToAdd.push(secondaryModule);
        break;
      case 5:
        const vampireModule = combinedArray.find(module => module.name.toLowerCase() === "vampirism");
        if(!vampireModule){
          console.error("Could not create character : missing module");
        }
        modulesToAdd.push(vampireModule);
        break;
      case 6:
        const lycanthropeModule = combinedArray.find(module => module.name.toLowerCase() === "lycanthropy");
        if(!lycanthropeModule){
          console.error("Could not create character : missing module");
        }
        modulesToAdd.push(lycanthropeModule);
        break;
    }
    system.created = true;
    actor.update({"system":system});

    const neutralStance = combinedArray.find(module => module.system.avd12_id.toLowerCase() === "lycanthropy");

    if (modulesToAdd.length > 0) {
      await actor.createEmbeddedDocuments("Item", modulesToAdd);
      console.log("Modules added to actor:", modulesToAdd);
  } else {
      console.warn("No modules found to add.");
  }

  }

  export async function createCharacter(actor){
    const origin_description_map ={
      "1":"You were born for the call of adventure. Start with +4 module points that do not count towards your total level.",
      "2":"You are bound in a contract with a powerful entity that grants you power at the expense of your service. Start with the Pact Module.",
      "3":"You are a mix of ancestries, inheriting the features and cultures of both. Pick a secondary ancestry type.",
      "4":"Your lineage is infused with that a of a specific plane. Choose a Planar Origin Module.",
      "5":"You are inflicted with vampirism, suffering the benefits and penalties of the condition. Start with the Vampirism Module.",
      "6":"You are inflicted with lycanthropy, transforming into a beast when threatened. Start with the Lycanthropy Module and choose a Lycanthrope Weakness Trait."
    }

    const size_description_map ={
      "2":"Small Creatures gain +1 Dodge and Stealth while having a -1 penalty to Movement Speed and Strength. They cannot wield Heavy Weapons and have a decreased carrying capacity.",
      "3":"Medium Creatures are standard size, gaining no penalties or bonuses.",
      "4":"Large creatures gain a +1 Strength and Block while having a -1 penalty to Stealth, Acrobatics and Dodge.They must consume 4 Meals per day to qualify for the benefits from a Full Rest. Additionally, they take up double the space of a normal creature but have an increased carrying capacity.",
    }

    const pack = game.packs.get("avd12.modules");
    if (!pack) {
        console.error(`Missing pack for ancestries`);
        return;
    }
    let compendiumItems = [];
    try {

        compendiumItems = await pack.getDocuments();
    } catch (error) {
        console.error(`Failed to load documents from modules`, error);
        return;
    }
    const ancestries = compendiumItems
    .filter(item => item.system.type === "racial" && item.system.origin === true)
    .map(item => ({ 
      name: item.name,
      details: item.system.details,
      _id: item._id,
      img: `systems/avd12/images/ancestries/${item.name.toLowerCase().replace(/\s+/g, '_')}.png`}));

    const races = Array.from(compendiumItems.filter(item => item.system.type === "racial" && item.system.origin === true));
    const planar = Array.from(compendiumItems.filter(item => item.system.type === "planar"));
    const alteration = Array.from(compendiumItems.filter(item => item.system.type === "alteration"));
    let creationData = {ancestries:ancestries, races:races,planar:planar, alteration:alteration, originType:1, origin_description_map:origin_description_map,size_description_map:size_description_map, sizeType:3}
    creationData.selected = creationData.ancestries[0];
    console.log(creationData.selected);
    let dialog = await AVD12CharacterCreatorDialog.create(actor, creationData)
    dialog.render(true)
  }