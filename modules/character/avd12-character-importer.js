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

    const image = await Avd12Utility.downloadImage(`https://anyventured12.com/upload/${data.imgurl}`)
    
    if(image){
      let options = Avd12Utility.parse("avd12/characters/");
      var file = new File([image], data.imgurl);
      await Avd12Utility.uploadToPath(options.current, file);
      await actor.update({ 'img': `avd12/characters/${data.imgurl}`})
    }
  }