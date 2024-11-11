export async function importData(actor, data){

    let actorRef= actor;
    //deletes all items
    await actor.deleteEmbeddedDocuments("Item", [], {
      deleteAll: true,
    });
    await actor.update({'system.usages':[]});
    /*Handle Attributes*/

    data.system.health.value = actor.system.health.value;
    data.system.focus.currentfocuspoints = actor.system.focus.currentfocuspoints;
    
    await actor.update({'system':data.system});
    await actor.update({ 'name': data.name})
    await actor.update({ 'prototypeToken.name': data.name});
    await actor.update({ 'prototypeToken.width': data.prototypeToken.width});
    await actor.update({ 'prototypeToken.height':  data.prototypeToken.height});
    await actor.update({ 'name': data.name})

    if(game.user.isGM){
      await Avd12Utility.verifyPath(Avd12Utility.parse("avd12/characters/"));
    }

    // ***** IMPORT INVENTORY AND MODULES ******
    data.items.forEach(item =>{
      if(item.type == "action"){
        item.uses = { current: 3, max : 3};
      }
      if(item.type == "reaction"){
        item.uses = { current: 2, max : 2};
      }
    });

    await actor.createEmbeddedDocuments("Item", data.items); 
    let stanceData = data.system.stance_data.split("-");
    let activeStance = stanceData.pop();
    let uniqueStances = [...new Set(stanceData)];
    for(let i = 0; i < uniqueStances.length; i++){
      await  game.packs.get('avd12.stances').getDocument(uniqueStances[i]).then(async function(x){
        if(uniqueStances[i]._id == activeStance)
          x.system.active = true;
        await actorRef.createEmbeddedDocuments('Item', [x]);
      });
    }
  }

  async function uploadImageLocally(){
    /*
    const image = await Avd12Utility.downloadImage(`https://anyventured12.com/upload/${data.imgurl}`)
    if(image){
      let options = Avd12Utility.parse("avd12/characters/");
      var file = new File([image], data.imgurl);
      await Avd12Utility.uploadToPath(options.current, file);
      await actor.update({ 'img': `avd12/characters/${data.imgurl}`})
    }
    */
  }

  export async function importCharacterModules(actor,data, cleanse){
    let moduleIds = actor.items.filter(item => item.type === "avd12module").map(item => item.id);
    if(cleanse){
      moduleIds = actor.items.filter(item => item.type === "avd12module" || item.type === "ballad" || item.type === "freeaction" || item.type === "action" || item.type === "reaction").map(item => item.id);
    }
    await actor.deleteEmbeddedDocuments("Item", moduleIds);
    let modules = data.items.filter(item => item.type === "avd12module");
    await actor.createEmbeddedDocuments("Item", modules);
    await actor.update({ "system.module_points": data.system.module_points });
  }

  async function overwriteCharacter(actor, data) {
    await actor.update({ "system": data.system });
    const itemIds = actor.items.map(item => item.id);
    await actor.deleteEmbeddedDocuments("Item", itemIds);
    await actor.createEmbeddedDocuments("Item", data.items);
    await actor.update({ 'name': data.name });
    await actor.update({ 'img': data.img });
    await actor.update({ 'prototypeToken': data.prototypeToken });

    let stances = data.system.stance_data.split("-");
    let activeStance = stances.pop();
    const compendium = game.packs.get("avd12.stances");
    await compendium.getIndex(); 
    const stanceDocuments = await Promise.all(stances.map(async stanceId => {
        const documents = await compendium.getDocuments();
        const stanceDoc = documents.find(doc => doc.system.avd12_id === stanceId);
        if (!stanceDoc) return null;
        const stanceData = stanceDoc.toObject();
        if (stanceId === activeStance) {
            stanceData.system.active = true;
        }
        return stanceData;
    }));
  
    await actor.syncAllItems();
    const matchedStances = stanceDocuments.filter(stance => stance !== null);
    await actor.createEmbeddedDocuments("Item", matchedStances);
}

  export async function importCharacter(actor, data){
    await overwriteCharacter(actor,data, true);
  }