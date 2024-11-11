
export function getBestLightSource(actor){
    let lightSources = actor.getEquippedLightSources();
    let bestLightSource = null;
    lightSources.forEach(item => {
      if(item.system.light.lightsource){
        if(bestLightSource){
          if(item.system.light.dim > bestLightSource.system.light.dim)
          bestLightSource = item;
        } else {
          bestLightSource = item;
        }
      }
    });
      if(bestLightSource){
        return bestLightSource.system.light;
      }
      else{
        return null;
      }
    }

export async function parseActiveEffects(actor){
    let protoToken = actor.prototypeToken;
    let lightsource = null;
    
    if(protoToken){ 
      lightsource = getBestLightSource(actor);
      if(actor.getActiveTokens().length > 0){
        protoToken = actor.getActiveTokens()[0].document;
      }
    }else{

    }
    let LightSourceOn = false;
    let overrideLight = false;
    let lightObj = {dim:0, bright:0, alpha:0.5, luminosity:0.5, animation:{type:"none", speed:5, intensity:5, reverse:false}, color:"#000000"}

    actor.temporaryEffects.forEach(effect => {
      switch(effect.statuses.values().next().value){
        case "afraid":
          actor.system.conditions.afraid = 1;
          break;
        case "bleeding":
          actor.system.conditions.bleeding = 1;
          break;
        case "blind":
          actor.system.conditions.blinded = 1;
          break;
        case "charmed":
          actor.system.conditions.charmed = 1;
          break;
        case "confused":
          actor.system.conditions.confused = 1;
          break;
        case "dazed":
          actor.system.conditions.dazed = 1;
          break;
        case "deafened":
          actor.system.conditions.deafened = 1;
          break;
        case "diseased":
          actor.system.conditions.diseased = 1;
          break;
        case "enveloped":
          actor.system.conditions.enveloped = 1;
          break;
        case "exhausted3":
          actor.system.conditions.exhausted = 3;
          break;
        case "exhausted2":
          actor.system.conditions.exhausted = 2;
            actor.system.bonus.weapon.damage = 0;
            actor.system.bonus.ranged.damage = 0;
            actor.system.bonus.spell.damage = 0;
            actor.system.bonus.slash.damage = 0;
            actor.system.bonus.unarmed.damage = 0;
            actor.system.bonus.pierce.damage = 0;
            actor.system.bonus.blunt.damage = 0;
            //disable reactions
            break;
        case "exhausted1":
            actor.system.conditions.exhausted = 1;
            actor.system.movement.walk.value -= 2;
            actor.system.universal.skills.initiative.finalvalue -= 2;
            break;
        case "frozen":
            actor.system.conditions.frozen = 1;
            //blue?
            actor.system.movement.walk.value = 0;
            actor.system.mitigation.cold.value = 99;
            lightObj.dim = 0.2
            lightObj.bright = 0.1
            lightObj.color = "#00bfff"
            lightObj.animation.type = "none"
            overrideLight = true;
            break;
        case "grappled":
          actor.system.conditions.grappled = 1;
          break;
        case "hidden":
          actor.system.conditions.hidden = 1;
          break;
        case "ignited":
          actor.system.conditions.ignited = 1;
          lightObj.dim = 1.5
          lightObj.bright = 1
          lightObj.color = "#ff3a00"
          lightObj.animation.type = "torch"
          overrideLight = true;
          break;
        case "invisible":
          actor.system.conditions.invisible = 1;
          break;
        case "maddened":
          actor.system.conditions.maddened = 1;
          break;
        case "muted":
          actor.system.conditions.muted = 1;
          break;
        case "paralyzed":
          actor.system.conditions.paralyzed = 1;
          break;
        case "poisoned":
          actor.system.conditions.poisoned = 1;
          break;
        case "prone":
          actor.system.conditions.prone = 1;
          actor.system.movement.walk.value = 2;
          break;
        case "sleeping":
          actor.system.conditions.sleeping = 1;
          break;
        case "stasis":
          actor.system.conditions.stasis = 1;
          break;
        case "stunned":
          actor.system.conditions.stunned = 1;
          break;
        case "trapped":
          actor.system.conditions.trapped = 1;
          break;
        case "unconscious":
          actor.system.conditions.unconscious = 1;
          break;
        case "wounded3":
          actor.system.conditions.wounded = 3;
        case "wounded2":
          actor.system.conditions.wounded = 2;
        case "wounded1":
          actor.system.conditions.wounded = 1;
          break;
        case "lightsource":
          LightSourceOn = true;
           break;
        case "default":
          break;
      }
    })
    if (game.user.isGM) {
        if (lightsource && LightSourceOn) {
            await protoToken.update({
                "light.dim": lightsource.dim,
                "light.animation": lightsource.animation,
                "light.bright": lightsource.bright,
                "light.color": lightsource.color,
                "light.alpha": lightsource.color_intensity,
                "light.luminosity": lightsource.luminosity
            });
        } else if (overrideLight) {
            await protoToken.update({
                "light.dim": lightObj.dim,
                "light.animation": lightObj.animation,
                "light.bright": lightObj.bright,
                "light.color": lightObj.color,
                "light.alpha": lightObj.color_intensity,
                "light.luminosity": lightObj.luminosity
            });
        } else if (protoToken) {
            await protoToken.update({
                "light.dim": 0,
                "light.bright": 0
            });
        }
    }
}
function resetLightsource(lightsource){
  lightsource.alpha = 0.5
  lightsource.angle = 360
  lightsource.animation.intensity = 5
  lightsource.animation.reverse = false
  lightsource.animation.speed = 5
  lightsource.animation.type = null
  lightsource.attenuation = 0.5
  lightsource.bright = 0
  //lightsource.color = null
  lightsource.coloration = 1
  lightsource.contrast = 0
  lightsource.darkness.min = 0
  lightsource.darkness.max = 1
  lightsource.dim = 0
  lightsource.luminosity = 0.5
  lightsource.saturation = 0
  lightsource.shadows = 0
  return lightsource
}