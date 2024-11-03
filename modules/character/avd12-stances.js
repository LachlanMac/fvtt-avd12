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

export function parseStances(actor) {
    let focusing = false;
    let activeStance = actor.items.find(stance => stance.system.active === true && stance.type === "stance");
    if (!activeStance) return;
    switch (activeStance.system.avd12_id) {
        case "1_neutral_stance":
            break;
        case "2_savage_stance":
            actor.system.attributes.might.skills.block.finalvalue -= 2;
            actor.system.attributes.agility.skills.dodge.finalvalue -= 2;
            // CRIT ON 11...
            break;
        case "3_light_stance":
            actor.system.attributes.agility.skills.dodge.finalvalue += 1;
            actor.system.movement.walk.value += 1;
            actor.system.bonus.weapon.attack -= 1;
            break;
        case "4_defensive_stance":
            actor.system.attributes.might.skills.block.finalvalue += 1;
            actor.system.attributes.agility.skills.dodge.finalvalue += 1;
            actor.system.attributes.willpower.skills.resistance.finalvalue += 1;
            actor.system.bonus.weapon.attack -= 1;
            break;
        case "5_precise_stance":
            actor.system.bonus.weapon.attack += 2;
            actor.system.bonus.weapon.damage -= 4;
            break;
        case "6_focus_stance":
            focusing = true;
            actor.system.attributes.willpower.skills.resistance.finalvalue += 2;
            break;
        case "7_wide_stance":
            actor.system.bonus.traits.wideattacks = 1;
            actor.system.movement.walk.value -= 1;
            break;
        case "8_dueling_stance":
            actor.system.bonus.traits.dueling = 1;
            actor.system.attributes.might.skills.block.finalvalue += 1;
            actor.system.attributes.agility.skills.dodge.finalvalue += 1;
            break;
        case "9_quick_toss_stance":
            actor.system.bonus.traits.quicktoss = 1;
            break;
        case "10_pivot_stance":
            // nothing
            break;
        case "11_control_stance":
            // nothing
            break;
        case "12_screen_stance":
            // partial cover
            break;
        case "14_juggernaut_stance":
            actor.system.movement.walk.value -= 1;
            actor.system.bonus.traits.juggernaut = 1;
            break;
        case "15_armsman_stance":
            actor.system.bonus.weapon.damage += 2;
            actor.system.bonus.traits.arsman = 1;
            break;
        case "16_reactive_stance":
            // nothing
            break;
        case "17_marksmans_focus":
            actor.system.bonus.ranged.attack += 1;
            focusing = true;
            break;
        case "18_flowing_strikes":
            actor.system.bonus.traits.flowingstrikes = 1;
            actor.system.bonus.unarmed.attack += 1;
            focusing = true;
            break;
        case "19_sentinel_stance":
            focusing = true;
            actor.system.bonus.traits.sentinel = 1;
            break;
        case "20_dual_wield":
            actor.system.bonus.traits.dualwield = 1;
            // nothing
            break;
        default:
            console.log("unknown active stance", activeStance.system.avd12_id);
    }
}
