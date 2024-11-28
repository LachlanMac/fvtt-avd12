import { IMAGES } from "../ui/images.js";

export function parseOption(actor, option) {
  if (!option.data) {
    return;
  }
  let dataTokens = option.data.split(":");
  let name = option.name;
  let description = option.description;

  if (dataTokens.length == 0) {
    return;
  }

  for (let i in dataTokens) {
    switch (dataTokens[i].charAt(0)) {
      case "A":
        switch (dataTokens[i].charAt(1)) {
          case "S": // Skill
            addSkill(actor, dataTokens[i]);
            break;
          case "Z": // Weapon skill
            addAttackSkill(actor, dataTokens[i], name, description, option.avd12_id);
            break;
          case "H": // Health
            addHealth(actor, dataTokens[i]);
            break;
          case "V": // Move speed
            addMovespeed(actor, dataTokens[i]);
            break;
          case "D": // Defense
            addDefense(actor, dataTokens[i]);
            break;
          case "C": // Crafting
            addCraftingSkill(actor, dataTokens[i]);
            break;
          case "L": // Language
            addLanguageSkill(actor, dataTokens[i]);
            break;
          default:
            break;
        }
        break;
      case "L": // Placeholder for L-type logic if needed
        break;
      case "W": // When clause
        handleWhenClause(actor, dataTokens[i]);
        break;
      case "T": // Trait
        addTrait(actor, dataTokens[i], description, name, option.avd12_id);
        break;
      case "X": // Action
        addAction(actor, name, description, option.avd12_id, option.custom, dataTokens[i]);
        break;
      case "Z": // Reaction
        addReaction(actor, name, description, option.avd12_id, option.custom, dataTokens[i]);
        break;
      case "Y": // Free action
        addFreeAction(actor, name, description, option.avd12_id, option.custom);
        break;
      case "H": // Fighting stance
        addFightingStance(actor, dataTokens[i], option.avd12_id);
        break;
      case "B": // Ballad
        if (dataTokens[i].charAt(1) === "S") {
          let data = dataTokens[i].split("=")[1];
          addBallad(actor, data.split(";")[0], data.split(";")[1]);
        } else {
          addBallad(actor, name, description);
        }
        break;
      case "F": // Conduit skills
        addConduitSkill(actor, dataTokens[i]);
        break;
      case "O": // Ranged skill
        addRangedSkill(actor, dataTokens[i]);
        break;
      case "I": // Immunity
        addImmunity(actor, dataTokens[i]);
        break;
      case "J": // Custom trait
        addCustomTrait(actor, {
          name: dataTokens[i].split("-")[0].split("=")[1],
          description: dataTokens[i].split("-")[1],
        });
        break;
      default:
        break;
    }
  }
}

function addSkill(actor, data) {
  let skillValue = Number(data.split("=")[1]);
  let skillCode = data.charAt(2);
  const skillMap = {
    1: "attributes.might.skills.athletics.finalvalue",
    2: "attributes.might.skills.strength.finalvalue",
    3: "attributes.agility.skills.acrobatics.finalvalue",
    4: "attributes.agility.skills.stealth.finalvalue",
    5: "attributes.willpower.skills.concentration.finalvalue",
    6: "attributes.willpower.skills.resilience.finalvalue",
    7: "attributes.knowledge.skills.arcanum.finalvalue",
    8: "attributes.knowledge.skills.medicine.finalvalue",
    9: "attributes.knowledge.skills.academic.finalvalue",
    A: "attributes.knowledge.skills.thievery.finalvalue",
    B: "attributes.knowledge.skills.wilderness.finalvalue",
    C: "attributes.social.skills.persuasion.finalvalue",
    D: "attributes.social.skills.insight.finalvalue",
    E: "attributes.social.skills.performance.finalvalue",
    F: "attributes.social.skills.animals.finalvalue",
    G: "universal.skills.search.finalvalue",
    H: "universal.skills.initiative.finalvalue",
  };
  let path = skillMap[skillCode];
  if (path) {
    // Split path and traverse the object
    path.split(".").reduce((obj, key, index, arr) => {
      if (index === arr.length - 1) {
        obj[key] += skillValue;
      }
      return obj[key];
    }, actor.system);
  } else {
    console.log("Unrecognized skill code:", skillCode);
  }
}

function addDefense(actor, data) {
  let skillValue = Number(data.split("=")[1]);
  let defenseCode = data.charAt(2);
  const mitigationMap = {
    1: "attributes.willpower.skills.resistance.finalvalue",
    2: "attributes.agility.skills.dodge.finalvalue",
    3: "attributes.might.skills.block.finalvalue",
    4: "mitigation.physical.value",
    5: "mitigation.cold.value",
    6: "mitigation.fire.value",
    7: "mitigation.dark.value",
    8: "mitigation.divine.value",
    9: "mitigation.psychic.value",
    A: ["mitigation.fire.value", "mitigation.cold.value", "mitigation.lightning.value"],
    B: "mitigation.lightning.value",
    C: "mitigation.arcane.value",
    Z: "cast_penalty",
  };
  let path = mitigationMap[defenseCode];
  if (!path) return;
  if (Array.isArray(path)) {
    path.forEach((p) => {
      p.split(".").reduce((obj, key, index, arr) => {
        if (index === arr.length - 1) obj[key] += skillValue;
        return obj[key];
      }, actor.system);
    });
  } else if (defenseCode === "Z") {
    actor.system.focus.castpenalty -= 1;
  } else {
    // For single-path cases
    path.split(".").reduce((obj, key, index, arr) => {
      if (index === arr.length - 1) obj[key] += skillValue;
      return obj[key];
    }, actor.system);
  }
}

function addConduitSkill(character, data) {
  const value = parseInt(data.split("=")[1]);
  switch (data.charAt(1)) {
    case "P":
      character.system.focus.focuspoints += value;
      break;
    case "R":
      character.system.focus.focusregen += value;
      break;
  }
}
function addAttackSkill(actor, data, name, description, custom_id) {
  let attackValue = Number(data.split("=")[1]);
  let attackCode = data.charAt(2);
  const attackMap = {
    1: "bonus.weapon.attack",
    2: "bonus.spell.attack",
    3: "bonus.weapon.damage",
    4: "bonus.spell.damage",
    5: "bonus.ranged.attack",
    6: "bonus.slash.attack",
    7: "bonus.blunt.attack",
    8: "bonus.pierce.attack",
    9: "bonus.ranged.damage",
    A: "bonus.slash.damage",
    B: "bonus.blunt.damage",
    C: "bonus.pierce.damage",
    D: "bonus.unarmed.crits",
    E: "bonus.slash.crits",
    F: "bonus.blunt.crits",
    G: "bonus.pierce.crits",
    H: "bonus.ranged.crits",
    I: "bonus.ranged.brutals",
    J: "bonus.slash.brutals",
    K: "bonus.blunt.brutals",
    L: "bonus.pierce.brutals",
    M: "bonus.unarmed.attack",
    N: "bonus.unarmed.damage",
    O: "bonus.unarmed.brutals",
    P: "bonus.unarmed.upgraded",
    R: "bonus.traits.armsman",
    W: "bonus.slash.upgraded",
    X: "bonus.blunt.upgraded",
    Y: "bonus.pierce.upgraded",
    Z: "bonus.ranged.upgraded",
  };

  if (attackCode === "T" || attackCode === "U" || attackCode === "V" || attackCode === "W") {
    addAttackOfOpportunity(actor, name, description, custom_id);
    return;
  }

  let path = attackMap[attackCode];
  if (!path) return;

  if (attackCode >= "D" && attackCode <= "Z" && attackCode !== "M" && attackCode !== "N" && typeof path === "string") {
    // Boolean flags for criticals and brutals, excluding M and N
    let keys = path.split(".");
    keys.reduce((acc, key, index) => {
      if (index === keys.length - 1) acc[key] = true;
      return acc[key];
    }, actor.system);
  } else {
    // Numerical bonus adjustments for attack or damage, including M and N
    path.split(".").reduce((obj, key, index, arr) => {
      if (index === arr.length - 1) obj[key] += attackValue;
      return obj[key];
    }, actor.system);
  }
}

function addMovespeed(actor, data) {
  let speedValue = Number(data.split("=")[1]);
  actor.system.movement.walk.value += speedValue;
}

function addHealth(actor, data) {
  let healthValue = Number(data.split("=")[1]);
  actor.system.health.max += healthValue;
}

function addCraftingSkill(actor, data) {
  const skillValue = Number(data.split("=")[1]);
  const craftingCode = data.charAt(2);
  const craftMap = {
    1: "craft.smithing",
    2: "craft.cooking",
    3: "craft.scribing",
    4: "craft.runecarving",
    5: "craft.alchemy",
    6: "craft.ammocraft",
    7: "craft.engineering",
    A: "all",
  };
  if (craftingCode === "A") {
    // Increment all crafting skills by skillValue
    Object.keys(actor.system.bonus.craft).forEach((skill) => {
      actor.system.bonus.craft[skill] += skillValue;
    });
  } else {
    // Increment specified crafting skill by skillValue
    const skillPath = craftMap[craftingCode];
    if (skillPath) {
      skillPath.split(".").reduce((obj, key, index, arr) => {
        if (index === arr.length - 1) obj[key] += skillValue;
        return obj[key];
      }, actor.system.bonus);
    }
  }
}

function handleWhenClause(character, data) {
  if (data.charAt(1) === "5") {
    addShieldClause(character, data);
  } else {
    addArmorClause(character, data);
  }
}

function addArmorClause(character, data) {
  const option = data.charAt(1);
  const value = Number(data.split("=")[1]);
  switch (option) {
    case "0": // unarmored
      switch (data.charAt(3)) {
        case "1":
          character.system.bonus.when.unarmored.resist += value;
          break;
        case "2":
          character.system.bonus.when.unarmored.dodge += value;
          break;
        case "3":
          character.system.bonus.when.unarmored.block += value;
          break;
        case "4":
          character.system.bonus.when.unarmored.physical += value;
          break;
        case "A":
          character.system.bonus.when.unarmored.elemental += value;
          break;
        case "R":
          character.system.bonus.when.unarmored.remove_penalties = true;
          break;
        case "Y":
          character.system.bonus.when.unarmored.remove_stealth_penalty = true;
          break;
        case "Z":
          character.system.bonus.when.unarmored.cast_penalty -= value;
          break;
      }
      break;

    case "1": // light armor
      switch (data.charAt(3)) {
        case "1":
          character.system.bonus.when.light_armor.resist += value;
          break;
        case "2":
          character.system.bonus.when.light_armor.dodge += value;
          break;
        case "3":
          character.system.bonus.when.light_armor.block += value;
          break;
        case "4":
          character.system.bonus.when.light_armor.physical += value;
          break;
        case "A":
          character.system.bonus.when.light_armor.elemental += value;
          break;
        case "R":
          character.system.bonus.when.light_armor.remove_penalties = true;
          break;
        case "Y":
          character.system.bonus.when.light_armor.remove_stealth_penalty = true;
          break;
        case "Z":
          character.system.bonus.when.light_armor.cast_penalty -= value;
          break;
      }
      break;
    case "2": //armored
    case "3":
    case "4":
      switch (data.charAt(3)) {
        case "1":
          character.system.bonus.when.armored.resist += value;
          break;
        case "2":
          character.system.bonus.when.armored.dodge += value;
          break;
        case "3":
          character.system.bonus.when.armored.block += value;
          break;
        case "4":
          character.system.bonus.when.armored.physical += value;
          break;
        case "A":
          character.system.bonus.when.armored.elemental += value;
          break;
        case "B":
          character.system.bonus.when.armored.move += value;
          break;
        case "R":
          character.system.bonus.when.armored.remove_penalties = true;
          break;
        case "Y":
          character.system.bonus.when.armored.remove_stealth_penalty = true;
          break;
        case "Z":
          character.system.bonus.when.armored.cast_penalty -= value;
          break;
      }
      break;
  }
}

function addShieldClause(character, data) {
  const value = Number(data.split("=")[1]);
  const keyMap = {
    1: "resist",
    2: "dodge",
    3: "block",
    4: "physical",
    A: "elemental",
    R: "remove_penalties",
  };
  const key = keyMap[data.charAt(3)];
  if (key) {
    if (key === "remove_penalties") {
      character.system.bonus.when.shield[key] = true;
    } else {
      character.system.bonus.when.shield[key] += value;
    }
  }
}

function addRangedSkill(character, data) {
  const value = parseInt(data.split("=")[1]);
  const keyMap = {
    1: "max_range_bonus_ulight",
    2: "max_range_bonus_light",
    3: "max_range_bonus_heavy",
    4: "max_range_bonus_uheavy",
    5: "min_range_bonus_ulight",
    6: "min_range_bonus_light",
    7: "min_range_bonus_heavy",
    8: "min_range_bonus_uheavy",
    9: ["max_range_bonus_ulight", "max_range_bonus_light", "max_range_bonus_heavy"],
  };
  const key = keyMap[data.charAt(1)];
  if (Array.isArray(key)) {
    key.forEach((k) => (character.system.bonus.ranged[k] += value));
  } else if (key) {
    character.system.bonus.ranged[key] += value;
  }
}

function getCustomAbility(name, description, custom_id, type, data) {
  let currentUses = 0;
  let maxUses = 0;
  let daily = false;
  if (type == "action" || type == "reaction") {
    currentUses = type == "action" ? 3 : 2;
    maxUses = type == "action" ? 3 : 2;

    let usageTokens = data.split("=")[1];

    if (usageTokens?.length == 3) {
      daily = usageTokens.charAt(1) == "D" ? true : false;
      currentUses = Number(usageTokens.charAt(2));
      maxUses = Number(usageTokens.charAt(2));
    }
  }

  let JSON = {
    name: name,
    type: type,
    img: "systems/avd12/images/icons/focus2.webp",
    system: {
      daily: daily,
      uses: {
        current: currentUses,
        max: maxUses,
      },
      description: description,
      avd12_id: custom_id,
    },
  };

  return JSON;
}

function addAction(actor, name, description, custom_id, custom, data) {
  let abilityData = {};
  if (custom) {
    abilityData = getCustomAbility(name, description, custom_id, "action", data);
  }
  actor.tmpActions.push({ name: name, description: description, custom_id: custom_id, data: abilityData });
}

function addReaction(actor, name, description, custom_id, custom, data) {
  let abilityData = {};
  if (custom) {
    abilityData = getCustomAbility(name, description, custom_id, "reaction", data);
  }
  actor.tmpReactions.push({ name: name, description: description, custom_id: custom_id, data: abilityData });
}

function addFreeAction(actor, name, description, custom_id, custom) {
  let abilityData = {};
  if (custom) {
    abilityData = getCustomAbility(name, description, custom_id, "freeaction");
  }
  actor.tmpFreeActions.push({ name: name, description: description, custom_id: custom_id, data: abilityData });
}

function addAttackOfOpportunity(actor, name, description, custom_id) {
  actor.tmpReactions.push({ name: name, description: description, custom_id: custom_id });
}

function addLanguageSkill(actor, data) {
  const languageMap = {
    S: "sylvan_29",
    D: "deadspeak_27",
    1: "common_1",
    2: "elven_2",
    3: "orcish_3",
    4: "goblin_4",
    5: "underspeak_26",
    6: "orycotal_6",
    7: "infernal_7",
    8: "lattus_8",
    9: "old_lattus_9",
    A: "arcanascript_10",
    B: "demonic_11",
    C: "divine_12",
    E: "hssshek_13",
    F: "giant_14",
    H: "shimmerspeak_15",
    I: "akan_16",
    J: "draconic_17",
    K: "old_draconic_18",
    L: "void_speak_19",
    M: "tidal_20",
    N: "aeron_21",
    O: "okkor_22",
    P: "gnilbark_23",
    Q: "as-bok_24",
    R: "qualatiq_25",
    U: "underspeak_26",
    V: "aeron_21",
    Z: "vethan_28",
  };
  const languageId = languageMap[data.charAt(2)];
  if (languageId) {
    actor.tmpLanguages.push({ custom_id: languageId });
  } else {
    console.log(`No matching language found for identifier: ${data.charAt(2)}`);
  }
}

function addTrait(actor, dataTokens, description, name, custom_id) {
  const baseTrait = {
    img: IMAGES["trait"],
    type: "temporary trait",
    name: name,
    system: {
      description: description,
      avd12_id: custom_id,
      data: "",
    },
  };
  switch (dataTokens.charAt(1)) {
    case "A": // ancestry and cultural
      actor.tmpTraits.push({ ...baseTrait, system: { ...baseTrait.system, traittype: "origin" } });
      break;
    case "O": // offense
      actor.tmpTraits.push({ ...baseTrait, system: { ...baseTrait.system, traittype: "offense" } });
      break;
    case "D": // defense
      actor.tmpTraits.push({ ...baseTrait, system: { ...baseTrait.system, traittype: "defense" } });
      break;
    case "G": // generic
    case "B": // beast
    case "T": // terrain
      actor.tmpTraits.push({ ...baseTrait, system: { ...baseTrait.system, traittype: "origin" } });
      break;
    case "C": // crafting
      actor.tmpTraits.push({ ...baseTrait, system: { ...baseTrait.system, traittype: "crafting" } });
      break;
    case "Y": // Custom traits with special cases
      switch (dataTokens.charAt(2)) {
        case "A":
          actor.system.bonus.traits.effective_blows = 1;
          break;
        case "B":
          actor.system.bonus.traits.scrapper = 1;
          break;
        case "D":
          actor.system.bonus.traits.dragonhorde = 1;
          break;
        case "N":
          actor.system.bonus.traits.naturalconduit = 1;
          break;
        case "T": //+2 throwing
          actor.system.bonus.traits.precise_throwing = 1;
          break;
        case "S": //Athetlics as attack modifier instead of weapon skill
          actor.system.bonus.traits.skilledchucking = 1;
          break;
        case "U": //Use heavy weapons and +2 range
          actor.system.bonus.traits.chucker = 1;
          break;
        default:
          console.log("ERROR: Unrecognized custom trait code in:", dataTokens);
          break;
      }
      break;
    case "4":
      actor.system.bonus.traits.climb_at_walk = 1;
      break;
    case "5":
      actor.system.bonus.traits.hover_at_walk = 1;
      break;
    case "6":
      actor.system.bonus.traits.swim_at_walk = 1;
      break;
    case "6":
      actor.system.bonus.traits.burrow_at_walk = 1;
      break;
    case "8":
      actor.system.bonus.traits.deadlythrowing = 1;
      break;
    case "9":
      actor.system.bonus.traits.koboldthrowing = 1;
      break;
    case "V":
      actor.system.bonus.traits.spellshot = 1;
      break;
    case "F":
      actor.system.bonus.traits.spellfist += 1;
      break;
    case "S":
      actor.tmpTraits.push({ ...baseTrait, system: { ...baseTrait.system, traittype: "offense" } });
      actor.system.bonus.traits.spellsword = 1;
      break;
    default:
      console.log("ERROR: Unrecognized data token:", dataTokens);
      break;
  }
}

function addFightingStance(actor, dataTokens) {
  const stanceMap = {
    1: "1_neutral_stance",
    2: "2_savage_stance",
    3: "3_light_stance",
    4: "4_defensive_stance",
    5: "5_precise_stance",
    6: "6_focus_stance",
    7: "7_wide_stance",
    8: "8_dueling_stance",
    9: "9_quick_toss_stance",
    10: "10_pivot_stance",
    11: "11_control_stance",
    12: "12_screen_stance",
    14: "14_juggernaut_stance",
    15: "15_armsman_stance",
    16: "16_reactive_stance",
    17: "17_marksmans_focus",
    18: "18_flowing_strikes",
    19: "19_sentinel_stance",
    20: "20_dual_wield",
    21: "21_cavalier_stance",
    22: "22_flawless_defense",
    23: "23_elemental_fist",
  };
  const identifier = dataTokens.split("=")[1];
  const custom_id = stanceMap[identifier];
  if (custom_id) {
    actor.tmpStances.push({ custom_id: custom_id });
  }
}

function addBallad(actor, title, details) {
  // Implement ballad-adding logic here
  console.log(`Adding ballad to ${actor.name} with title: ${title}, details: ${details}`);
}

function addImmunity(actor, dataTokens) {
  const immunityMap = {
    1: "1_immunity_to_afraid",
    2: "2_immunity_to_bleeding",
    3: "3_immunity_to_blinded",
    4: "4_immunity_to_charmed",
    5: "5_immunity_to_confused",
    6: "6_immunity_to_dazed",
    7: "7_immunity_to_deafened",
    8: "8_immunity_to_diseased",
    9: "9_immunity_to_enveloped",
    10: "10_immunity_to_exhausted",
    11: "11_immunity_to_frozen",
    12: "12_immunity_to_grappled",
    13: "13_immunity_to_hidden",
    14: "14_immunity_to_ignited",
    15: "15_immunity_to_invisible",
    16: "16_immunity_to_maddened",
    17: "17_immunity_to_muted",
    18: "18_immunity_to_paralyzed",
    19: "19_immunity_to_poisoned",
    20: "20_immunity_to_prone",
    21: "21_immunity_to_sleeping",
    22: "22_immunity_to_stasis",
    23: "23_immunity_to_stunned",
    24: "24_immunity_to_trapped",
    25: "25_immunity_to_unconscious",
    26: "26_immunity_to_wounded",
  };
  const identifier = dataTokens.split("=")[1];
  const custom_id = immunityMap[identifier];
  if (custom_id) {
    actor.tmpImmunities.push({ custom_id: custom_id });
  }
}

function addCustomTrait(actor, { name, description }) {
  // Implement custom trait-adding logic here
  console.log(`Adding custom trait to ${actor.name} with name: ${name}, description: ${description}`);
}
