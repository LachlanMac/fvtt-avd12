
function getDamageDice(actor, category, upgraded){
    let dice = "1d0"
    switch(category){
        case "unarmed":
            upgraded == 1 ? dice = "2d6" : dice = "1d8"
            break;
        case "light1h":
            upgraded == 1 ? dice = "2d6" : dice = "1d8"
            break;
        case "heavy1h":
            upgraded == 1 ? dice = "2d8" : dice = "1d10"
            break;
        case "light2h":
            upgraded == 1 ? dice = "3d6" : dice = "3d4"
            break;
        case "heavy2h":
            upgraded == 1 ? dice = "3d8" : dice = "2d8"
            break;
        case "ulightranged":
            upgraded == 1 ? dice = "1d10" : dice = "1d6"
            break;
        case "lightranged":
            upgraded == 1 ? dice = "2d6" : dice = "2d4"
            break;
        case "heavyranged":
            upgraded == 1 ? dice = "3d6" : dice = "2d6"
            break;
    }
    return dice
}

function addWeaponDamage(damages, bonusDamage, dice) {
    if (damages.primary.damagetype != "none" && damages.primary.dice) {
      let fullBonus = Number(bonusDamage) + Number(damages.primary.bonus)
      damages.primary.dice = dice;
      damages.primary.normal = damages.primary.dice + '+' + fullBonus;
      damages.primary.critical = damages.primary.dice + '+' + (Number(fullBonus) * 2);
      let parser = damages.primary.dice.match(/(\d+)(d\d+)/)
      let nbDice = 2
      if (parser && parser[1]) {
        nbDice = Number(parser[1]) * 2
      }
      damages.primary.brutal = nbDice + parser[2] + '+' + (Number(fullBonus) * 2);
    }    
    if (damages.secondary.damagetype != "none" && damages.secondary.dice) {
        damages.secondary.normal = damages.secondary.dice + (damages.secondary.bonus == 0 ? "" : (damages.secondary.bonus > 0 ? "+" : "") + damages.secondary.bonus);
    }
    if (damages.tertiary.damagetype != "none" && damages.tertiary.dice) {
        damages.tertiary.normal = damages.tertiary.dice + (damages.tertiary.bonus == 0 ? "" : (damages.tertiary.bonus > 0 ? "+" : "") + damages.tertiary.bonus);
    }
}

export function prepareWeapon(actor, item){
    if(!item.system.equipped){
        return;
    }
    let weapon = foundry.utils.duplicate(item);

    if(item.thrown) weapon.thrown = true;
    
    let weaponAttackBonus = 0;
    if(actor.system.bonus.traits.spellsword && weapon.system.focus?.isfocus){
        weaponAttackBonus = actor.system.bonus.spell.attack + weapon.system.bonus.attack;
    }else if(weapon.system.weapontype == "custom"){
        weaponAttackBonus = actor.system.bonus.weapon.attack + weapon.system.bonus.attack
    }else{
        weaponAttackBonus = actor.system.bonus.weapon.attack + weapon.system.bonus.attack + actor.system.bonus[weapon.system.weapontype].attack
    }
    if(weapon.thrown){
      if(actor.system.bonus.traits.skilledchucking){
      weaponAttackBonus = weapon.system.bonus.attack + actor.system.attributes.might.skills.athletics.finalvalue;
      }
      if(actor.system.bonus.traits.precise_throwing){
        weaponAttackBonus += 2;
      }
    }

    //HANDLE DAMAGE BONUS
    let weaponDamageBonus = 0;
    if(weapon.system.category == "custom"){
      weaponDamageBonus = 0;
    }else if(weapon.thrown){
      weaponDamageBonus = actor.system.attributes.might.skills.athletics.finalvalue;
    }else{
      weaponDamageBonus = parseInt(actor.system.bonus.weapon.damage) + actor.system.bonus[weapon.system.weapontype].damage
    }
    if(actor.system.bonus.traits.spellsword && weapon.system.focus?.isfocus){
      weaponDamageBonus = actor.system.bonus.spell.damage;
    }

    //HANDLE DICE
    let weaponDamageDice = "1d8";
    if(weapon.system.category == "custom"){
      weaponDamageDice = item.system.damages.primary.dice;
    }else{
      weaponDamageDice = getDamageDice(actor, weapon.system.category, actor.system.bonus[weapon.system.weapontype].upgraded)
    }

    //check for dueling stance
    if(actor.system.bonus.dueling &&(weapon.system.category == "heavy1h" || weapon.system.category == "light1h") &&!actor.items.find(i => i.type == "shield" && i.system.equipped))
      weaponDamageBonus += 2;
    //check for sentinel stance
    else if(actor.system.bonus.traits.sentinel == 1 && weapon.system.category == "light2h")
      weaponDamageBonus += actor.system.attributes.knowledge.skills.academic.finalvalue;
    //check for juggernaut stance
    else if(actor.system.bonus.traits.juggernaut == 1 && (weapon.system.category == "heavy1h" || weapon.system.category == "heavy2h"))
      weaponDamageBonus += 2;
    

    weapon.dice = weaponDamageDice;
    weapon.attackBonus = weaponAttackBonus;

    addWeaponDamage(weapon.system.damages, weaponDamageBonus, weaponDamageDice);
    setRanged(actor, weapon);
    return weapon;
}

export function prepareThrowingAmmunition(actor, item){
  if(!item.system.equipped){
    return;
  }
  let ammo = foundry.utils.duplicate(item);
  if(ammo.system.throwtype == "throwing_ammo" || ammo.system.throwtype == "throwable"){
    ammo.system.minrange = 2;
    ammo.system.maxrange = Math.max(4, 4 + actor.system.attributes.might.skills.athletics.finalvalue);
    if(actor.system.bonus.traits.chucker){
      ammo.system.maxrange += 2;
    }
  }

  let dice = "";
  if(ammo.system.throwtype == "throwing_ammo"){
    dice = "1d6";
    ammo.system.maxrange += 2;
    if(actor.system.bonus.traits.deadlythrowing == 1){
      actor.system.conditions.hidden ? dice = "2d10" : dice = "1d10";
    }
  }

  ammo.system.damages.primary.dice = dice;

  ammo.attackBonus = actor.system.attributes.might.skills.athletics.finalvalue;
  ammo.dice = dice;
  let damageBonus = actor.system.attributes.might.skills.athletics.finalvalue + (actor.system.bonus.traits.koboldthrowing == 1 ? 2 : 0)
  
  addThrowDamage(ammo.system.damages.primary, damageBonus, dice)
  return ammo;
}


function addThrowDamage(damage, bonusDamage, dice) {
  if (damage.damagetype != "none" && damage.dice) {
    let fullBonus = Number(bonusDamage) + Number(damage.bonus)
    damage.dice = dice;
    damage.normal = damage.dice + '+' + fullBonus ;
    damage.critical = damage.dice + '+' + Number(fullBonus) * 2;
    let parser = damage.dice.match(/(\d+)(d\d+)/)
    let nbDice = 2
    if (parser && parser[1]) {
      nbDice = Number(parser[1]) * 2
    }
    damage.brutal = nbDice + parser[2] + "+" + (Number(fullBonus) * 2);
  }
}


function setRanged(actor, weapon){
  switch(weapon.system.category){
    case "ulightranged":
      weapon.system.minrange -= actor.system.bonus.ranged.min_range_bonus_ulight;
      weapon.system.maxrange += actor.system.bonus.ranged.max_range_bonus_ulight;
      break;
    case "lightranged":
      weapon.system.minrange -= actor.system.bonus.ranged.min_range_bonus_light;
      weapon.system.maxrange += actor.system.bonus.ranged.max_range_bonus_light;
      break;
    case "heavyranged":
      weapon.system.minrange -= actor.system.bonus.ranged.min_range_bonus_heavy;
      weapon.system.maxrange += actor.system.bonus.ranged.max_range_bonus_heavy;
      break;
    case "light1h":
      if(weapon.thrown){
        weapon.system.minrange = 2;
        weapon.system.maxrange = Math.max(4, 4 + actor.system.attributes.might.skills.athletics.finalvalue) + (actor.system.bonus.traits.chucker == 1 ? 2 : 0);
      }
      break;
    case "heavy1h":
      if(weapon.thrown){
        weapon.system.minrange = 2;
        weapon.system.maxrange = Math.max(2, 1 + actor.system.attributes.might.skills.athletics.finalvalue) + (actor.system.bonus.traits.chucker == 1 ? 2 : 0);
      }
      break;
  } 
}
