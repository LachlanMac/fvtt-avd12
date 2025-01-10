

import {AVD12CharacterCreatorDialog} from "../dialog/avd12-character-creator-dialog.js"


export async function confirmCreateCharacter(actor, data){
    let system = actor.system;
    system.origin_trait = data.origin;
    system.biodata.size = data.size;

    const combinedArray = [...data.cultures.values(), ...data.planar.values(), ...data.alteration.values()];
    // Find the primary module in the combinedArray by matching _id
    //const primaryModule = data.ancestries.find(module => module._id === data.primary._id);
    //const secondaryModule = data.secondary ? data.ancestries.find(module => module._id === data.secondary._id) : null;
    
    //if(!primaryModule){
    //  console.error("Could not create character : missing module");
    //  return;
   // }
    let modulesToAdd = [];
    let ancestriesToAdd = [];


    const primaryAncestry = data.ancestries.values().find(module => module._id === data.primary._id);
    ancestriesToAdd.push(primaryAncestry);
    if(data.secondary){
      const secondaryAncestry = data.ancestries.values().find(module => module._id === data.secondary._id);

      ancestriesToAdd.push(secondaryAncestry);
      system.module_points -= 2;
    }
    const cultureModule = combinedArray.find(module => module._id === data.culture._id);
    if(!cultureModule){
      console.error("Could not create character : cultureModule missing module");
    }else{
      modulesToAdd.push(cultureModule);
    }

    switch(data.origin){
      case 1:
    
        break;
      case 2://PACT
        const pactModule = combinedArray.find(module => module.name.toLowerCase() === "pact");
        if(!pactModule){
          console.error("Could not create character :pact  missing module");
        }else{
          system.module_points -= 4;
          modulesToAdd.push(pactModule);
        }
        break;
      case 4://planar module
        const planarModule = combinedArray.find(module => module._id === data.plane._id);
        if(!planarModule){
          console.error("Could not create character : planar missing module");
        }else{
          system.module_points -= 4;
          modulesToAdd.push(planarModule);
        }
     
        break;
      case 5:
        const vampireModule = combinedArray.find(module => module.name.toLowerCase() === "vampirism");
        if(!vampireModule){
          console.error("Could not create character : vampire missing module");
        }else{
          system.module_points -= 4;
          modulesToAdd.push(vampireModule);
        }
        break;
      case 6:
        const lycanthropeModule = combinedArray.find(module => module.name.toLowerCase() === "lycanthropy");
        if(!lycanthropeModule){
          console.error("Could not create character : lycanthrope missing module");
        }else{
          system.module_points -= 4;
          modulesToAdd.push(lycanthropeModule);
        }
       
        break;
    }

    let toAdd = [...ancestriesToAdd, ...modulesToAdd];
    system.created = true;
    await actor.update({"system":system});
    await actor.update ({"name":data.name});
    await actor.createEmbeddedDocuments("Item", toAdd);
  

}


  export async function createCharacter(actor){
    const origin_description_map ={
      "1":"You were born for the call of adventure and do have an extra 4 Module Points to spend.",
      "2":"You are bound in a contract with a powerful entity that grants you power at the expense of your service. Start with the Pact Module.",
      "4":"Your lineage is infused with that a of a specific plane. Choose a Planar Origin Module.",
      "5":"You are inflicted with vampirism, suffering the benefits and penalties of the condition. Start with the Vampirism Module.",
      "6":"You are inflicted with lycanthropy, transforming into a beast when threatened. Start with the Lycanthropy Module and choose a Lycanthrope Weakness Trait."
    }

    const size_description_map ={
      "2":"Small Creatures gain +1 Dodge and Stealth while having a -1 penalty to Movement Speed and Strength. They cannot wield Heavy Weapons and have a decreased carrying capacity.",
      "3":"Medium Creatures are standard size, gaining no penalties or bonuses.",
      "4":"Large creatures gain a +1 Strength and Block while having a -1 penalty to Stealth, Acrobatics and Dodge.They must consume 4 Meals per day to qualify for the benefits from a Full Rest. Additionally, they take up double the space of a normal creature but have an increased carrying capacity.",
    }

    const ancestryPack = game.packs.get("avd12.ancestries");
    const pack = game.packs.get("avd12.modules");
    if (!pack || !ancestryPack) {
        console.error(`Missing pack for ancestries`);
        return;
    }

    let compendiumItems = [];
    let ancestryItems = [];
    try {
        ancestryItems = await ancestryPack.getDocuments();
        compendiumItems = await pack.getDocuments();
    } catch (error) {
        console.error(`Failed to load documents from modules`, error);
        return;
    }


    ancestryItems.forEach(item => {
      const name = item.name;
      const details = item.system.details;
      const _id = item._id;
      const img = `systems/avd12/images/ancestries/${name.toLowerCase().replace(/\s+/g, '_')}.png`;
      item.name = name;
      item.details = details;
      item.img = img;
  });
  
  
    /*
  const ancestries = ancestryItems.map(item => ({ 
      name: item.name,
      details: item.system.details,
      _id: item._id,
      img: `systems/avd12/images/ancestries/${item.name.toLowerCase().replace(/\s+/g, '_')}.png`}));
  */
    const cultures = Array.from(compendiumItems.filter(item => item.system.type === "racial"));
    const planar = Array.from(compendiumItems.filter(item => item.system.type === "planar"));
    const alteration = Array.from(compendiumItems.filter(item => item.system.type === "alteration"));
    let creationData = {ancestries:ancestryItems, cultures:cultures,planar:planar, alteration:alteration, originType:1, origin_description_map:origin_description_map,size_description_map:size_description_map, sizeType:3}
    creationData.selected = creationData.ancestries[0];


    let dialog = await AVD12CharacterCreatorDialog.create(actor, creationData)
    dialog.render(true)
  }