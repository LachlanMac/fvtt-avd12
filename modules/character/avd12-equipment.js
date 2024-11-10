
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
    

    //Handle Attack
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
    //Handle Damage
    let weaponDamageBonus = 0;
    if(weapon.system.category == "custom"){
      weaponDamageBonus = 0;
    }else if(weapon.thrown){
      weaponDamageBonus = actor.system.attributes.might.skills.athletics.finalvalue;
    }else{
      weaponDamageBonus = parseInt(actor.system.bonus.weapon.damage) + actor.system.bonus[weapon.system.weapontype].damage
    }

    let weaponDamageDice = weapon.system.category == "custom" ? weaponDamageDice = weapon.system.dice: getDamageDice(actor, weapon.system.category, actor.system.bonus[weapon.system.weapontype].upgraded);

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

      //actor.system.bonus.traits.precise_throwing;  //+2 attack with throwing weapons
  //actor.system.bonus.traits.skilledchucking; // atheltics as attack modifier instead of wepaon
  //actor.system.bonus.traits.chucker  // throw heavy weapons +2 range on all weapons

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

function preparseWeapon(weapon) {
    if(weapon.type == 'equipable'){
      return;
    }
    if(this.system.bonus.traits.spellsword && weapon.system.focus?.isfocus){
      weapon.attackBonus = this.system.bonus.spell.attack + weapon.system.bonus.attack;
    }else if(weapon.system.weapontype == "custom"){
      weapon.attackBonus = this.system.bonus.weapon.attack + weapon.system.bonus.attack
    }else{
      weapon.attackBonus = this.system.bonus.weapon.attack + weapon.system.bonus.attack + this.system.bonus[weapon.system.weapontype].attack
    }

    
    let bonusDamage = parseInt(this.system.bonus.weapon.damage);
    if(this.system.bonus.dueling){
      let equippedShield = this.items.find(item => item.type == "shield" && item.system.equipped)
      if(!equippedShield){
        bonusDamage += 2;
      }
    }
  
    let upgraded = 0;
    let dice = "";
    let thrownDice = "";
    if(weapon.system.weapontype != "custom"){
      upgraded = this.system.bonus[weapon.system.weapontype].upgraded;
    }

    if(this.type == "npc"){
      weapon.attackBonus = this.system.bonus.npc.attack_accuracy + weapon.system.bonus.attack;
      bonusDamage = this.system.bonus.npc.attack_power;
    }

    switch(weapon.system.category){
      case "custom":
        dice = weapon.system.damages.primary.dice;
        break;
      case "unarmed":
        upgraded == 1 ?  (this.system.level.value >= 9? dice = "2d8" : dice = "1d10") : dice = "1d6"
      break;
      case "light1h":
        weapon.system.thrown = true;
        if(this.system.bonus.traits.dueling == 1)
          bonusDamage += 2
        upgraded == 1 ? dice = "2d6" : dice = "1d8"
        break;
      case "heavy1h":
        if(this.system.bonus.traits.dueling == 1)
          bonusDamage += 2
        if(this.system.bonus.traits.juggernaut == 1)
          bonusDamage += 2
        weapon.system.thrown = true;
        upgraded == 1 ? dice = "2d8" : dice = "1d10"
        break;
      case "light2h":
        weapon.system.thrown = true;
        upgraded == 1 ? dice = "3d6" : dice = "3d4"
        break;
      case "heavy2h":
        if(this.system.bonus.traits.juggernaut == 1)
          bonusDamage += 2
        weapon.system.thrown = true;
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
    if(weapon.system.damages.primary.dice == "1d4"){
      weapon.system.thrown = false;
    }

    switch(weapon.system.category){
      case "ulightranged":
        weapon.system.minrange -= this.system.bonus.ranged.min_range_bonus_ulight;
        weapon.system.maxrange += this.system.bonus.ranged.max_range_bonus_ulight;
        break;
      case "lightranged":
        weapon.system.minrange -= this.system.bonus.ranged.min_range_bonus_light;
        weapon.system.maxrange += this.system.bonus.ranged.max_range_bonus_light;
        break;
      case "heavyranged":
        weapon.system.minrange -= this.system.bonus.ranged.min_range_bonus_heavy;
        weapon.system.maxrange += this.system.bonus.ranged.max_range_bonus_heavy;
        break;
      case "light1h":
      case "light2h":
        if(weapon.system.thrown){
        weapon.system.minrange = 2;
        weapon.system.maxrange = Math.max(4, 4 + this.system.attributes.might.skills.athletics.finalvalue);
        if(this.system.bonus.traits.quicktoss)
          this.system.bonus.traits.chucker == 1 ? thrownDice = "2d8" : thrownDice = "2d6"         
        else
          this.system.bonus.traits.chucker == 1 ? thrownDice = "1d8" : thrownDice = "1d6"
        if(this.system.bonus.traits.skilledchucking && weapon.attackBonus + 4 > weapon.system.maxrange)
          weapon.system.maxrange = weapon.attackBonus + 4;
        break;
        }
      case "heavy1h":
      case "heavy2h":
        if(weapon.system.thrown){
          weapon.system.minrange = 2;
          weapon.system.maxrange = Math.max(0, 1 + this.system.attributes.might.skills.athletics.finalvalue);
          if(this.system.bonus.traits.skilledchucking && weapon.attackBonus + 1 > weapon.system.maxrange)
            weapon.system.maxrange = weapon.attackBonus + 1;
          if(this.system.bonus.traits.quicktoss)
            this.system.bonus.traits.chucker == 1 ? thrownDice = "2d12" : thrownDice = "2d8"
          else
            this.system.bonus.traits.chucker == 1 ? thrownDice = "1d12" : thrownDice = "1d8"
          break;
        }
    } 
    
  if(weapon.system.minrange < 0)
    weapon.system.minrange = 0;
  if(weapon.system.damages.primary.dice == "1d4"){
    this.thrown = false;
    this.addPrimaryDamage(weapon.system.damages.primary, bonusDamage, "1d4", "")
    this.addOtherDamage(weapon.system.damages.secondary, bonusDamage)
    this.addOtherDamage(weapon.system.damages.tertiary, bonusDamage)
  }else{
    let extraDamage = "";
    if(this.system.bonus.traits.flowingstrikes && weapon.system.category == "unarmed")
      extraDamage = "+1d4";
      
    weapon.dice = dice;
    weapon.extraDamage = extraDamage;
    weapon.critEligble =  bonusDamage + (weapon.system.category == "custom" ? 0 :this.system.bonus[weapon.system.weapontype].damage) + parseInt(weapon.system.damages.primary.bonus);



    let calculatedDamage = bonusDamage + (weapon.system.category == "custom" ? 0 :this.system.bonus[weapon.system.weapontype].damage);

    if(this.system.bonus.traits.spellsword && weapon.system.focus?.isfocus){
      weapon.critEligble =  bonusDamage + this.system.bonus.spell.damage + parseInt(weapon.system.damages.primary.bonus);
      calculatedDamage = bonusDamage + this.system.bonus.spell.damage;
    }

    if(this.system.bonus.traits.sentinel == 1 && weapon.system.category == "light2h")
      calculatedDamage = this.system.attributes.knowledge.skills.academic.finalvalue + bonusDamage;
    
    
    this.addPrimaryDamage(weapon.system.damages.primary, calculatedDamage, dice, extraDamage)
    
    if(weapon.system.thrown){
      if(this.system.bonus.traits.spellsword && weapon.system.focus?.isfocus){
        this.addPrimaryThrownDamage(weapon.system.damages.primary, bonusDamage + this.system.bonus.spell.damage, thrownDice, "")
      }else{
        this.addPrimaryThrownDamage(weapon.system.damages.primary, bonusDamage + this.system.bonus[weapon.system.weapontype].damage, thrownDice, "")

      }
      weapon.throwndice = thrownDice;
  
    }

    this.addOtherDamage(weapon.system.damages.secondary, bonusDamage)
    this.addOtherDamage(weapon.system.damages.tertiary, bonusDamage)
  }
  }




/*

//in progress
getParsedWeapon(w){
  if(w.type == 'equipable'){
    return;
  }
  let weapon = foundry.utils.duplicate(w);

  //attack bonus = general attack + weapon bonus + character skill bonus
  //weapon.attackBonus = this.system.bonus.weapon.attack + weapon.system.bonus.attack + this.system.bonus[weapon.system.weapontype].attack

  //get all bases
  let weaponDamageBonus = parseInt(this.system.bonus.weapon.damage);  //bonus damage on the weapon
  let weaponDamageDice = Avd12Equipment.getDamageDice(weapon.system,category,this.system.bonus[weapon.system.weapontype].upgraded);
  let weaponAttackBonus = this.system.bonus.weapon.attack + weapon.system.bonus.attack + this.system.bonus[weapon.system.weapontype].attack;
  
  //STANCES::
  //check for dueling stance
  if(this.system.bonus.dueling &&(weapon.system.category == "heavy1h" || weapon.system.category == "light1h") &&!this.items.find(item => item.type == "shield" && item.system.equipped))
    weaponDamageBonus += 2;
  //check for sentinel stance
  else if(this.system.bonus.traits.sentinel == 1 && weapon.system.category == "light2h")
    weaponDamageBonus += this.system.attributes.knowledge.skills.academic.finalvalue;
  //check for juggernaut stance
  else if(this.system.bonus.traits.juggernaut == 1 && (weapon.system.category == "heavy1h" || weapon.system.category == "heavy2h"))
    weaponDamageBonus += 2;
  

  let extraNonCritDice = ""
  let extraNonCritDamage = ""
  //calculate non-crit eligble damage
  if(this.system.bonus.traits.flowingstrikes && weapon.system.category == "unarmed"){
    extraNonCritDice = "+1d4";
  }
}

*/