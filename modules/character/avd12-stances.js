export async function addStance(actor, stance){
    let actorRef = actor;
    await game.packs.get('avd12.stances').getDocument(stance).then(function(x){
      x.system.active = false;
      actorRef.createEmbeddedDocuments('Item', [x])
    });
  }

export async function changeStance(actor, stanceId){
    actor.items.forEach(async item => {
      if(item.type == "stance"){   
        item.system.active = false;
        await actor.updateEmbeddedDocuments("Item", [{ _id: item.id, 'system.active': false }]);
      }
    })
    let stance = actor.items.get(stanceId);
    stance.system.active = true;
    await actor.updateEmbeddedDocuments("Item", [{ _id: stance.id, 'system.active': true }]);
  }


export function parseStances(actor){
    let focusing = false;
    let activeStance = actor.items.find(stance => stance.system.active == true && stance.type == "stance");

    if(!activeStance)
      return;
    switch(Number(activeStance.system.id)){
      case 1://neutral
          break;
      case 2://savage
          actor.system.attributes.might.skills.block.finalvalue -= 2;
          actor.system.attributes.agility.skills.dodge.finalvalue -= 2;
          //CRIT ON 11...
          break;
      case 3://light
          actor.system.attributes.agility.skills.dodge.finalvalue += 1;
          actor.system.movement.walk.value += 1;
          actor.system.bonus.weapon.attack -= 1;
          break;
      case 4://defensive
          actor.system.attributes.might.skills.block.finalvalue += 1;
          actor.system.attributes.agility.skills.dodge.finalvalue += 1;
          actor.system.attributes.willpower.skills.resistance.finalvalue += 1;
          actor.system.bonus.weapon.attack -= 1;
          break;
      case 5://precise
          actor.system.bonus.weapon.attack += 2;
          actor.system.bonus.weapon.damage -= 4;
          break;
      case 6://focus
          focusing = true;
          actor.system.attributes.willpower.skills.resistance.finalvalue += 2;
          break;
      case 7://wide
          actor.system.bonus.traits.wideattacks = 1;
          actor.system.movement.walk.value -= 1;
          break;
      case 8://dueling
          actor.system.bonus.traits.dueling = 1;
          actor.system.attributes.might.skills.block.finalvalue += 1;
          actor.system.attributes.agility.skills.dodge.finalvalue += 1;
          break;
      case 9://quicktooss
          actor.system.bonus.traits.quicktoss = 1;
          break;
      case 10://pivot
          //nothing
          break;
      case 11://control
          //nothing
          break;
      case 12://screen
          //partial cover
          break;
      case 13://NO EXIST
          //does not exist
          break;
      case 14:  //juggernaut  
          actor.system.movement.walk.value -= 1;
          actor.system.bonus.traits.juggernaut = 1;
          break;
      case 15://arsman
          actor.system.bonus.weapon.damage += 2;
          actor.system.bonus.traits.arsman = 1;
          break;
      case 16:  //reactive
          //
          break;
      case 17: //marskamn
          actor.system.bonus.ranged.attack += 1;
          focusing = true;
          break;
      case 18:  //flowing strikes
          actor.system.bonus.traits.flowingstrikes = 1;
          actor.system.bonus.unarmed.attack += 1;
          focusing = true;
          break;
      case 19: //sentinel
          focusing = true;
          actor.system.bonus.traits.sentinel = 1;
          break;
      case 20:  //dual wield
          actor.system.bonus.traits.dualwield = 1;
          //nothing
          break;
      default:
          console.log("unknown active stance", activeStance.system.id);
    }
  }