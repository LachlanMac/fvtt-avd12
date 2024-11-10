import { Avd12RestDialog } from "../dialog/avd12-rest-dialog.js";
import { Avd12Utility } from "../avd12-utility.js";
import { resetActions } from "./avd12-actions.js";

export async function takeBreather(actor){
    let restData = {actor:actor,breather:true};
    await resetActions(actor, false);

    Avd12Utility.createRestChatMessage(restData);
  }

  export async function takeRest(actor, data, favorable){
      let totalPowerRegen = actor.system.focus.focusregen;
      if(Number(data.bonusPower)){
        totalPowerRegen += Number(data.bonusPower);
      }
      let totalHealthRegen = actor.system.level.value * (favorable ? 2 : 1);
      if(Number(data.bonusHealth)){
        totalHealthRegen += Number(data.bonusHealth);
      }
      let restData = {};
      restData.actor = actor;
      let currentHealth = actor.system.health.value;
      let currentPower = actor.system.focus.currentfocuspoints;
      actor.system.health.value = Math.min(actor.system.health.max, (totalHealthRegen + actor.system.health.value))
      actor.system.focus.currentfocuspoints = Math.min(actor.system.focus.focuspoints, (totalPowerRegen + actor.system.focus.currentfocuspoints))
      actor.update({ 'system.health.value': actor.system.health.value})
      actor.update({ 'system.focus.currentfocuspoints': actor.system.focus.currentfocuspoints})
      restData.health = actor.system.health.value - currentHealth;
      restData.power = actor.system.focus.currentfocuspoints - currentPower;
      if(favorable){
        restData.favorable = "Favorable"
      }else{
        restData.favorable = "";
      }
      await resetActions(actor, true);
      Avd12Utility.createRestChatMessage(restData);
    }

    export async function rest(actor){
      let dialog = await Avd12RestDialog.create(actor)
      dialog.render(true)
    }