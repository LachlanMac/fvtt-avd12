import { Avd12Utility } from "../avd12-utility.js";
import { parseOption } from "./avd12-option-parser.js";
import { IMAGES } from "../ui/images.js";

export function getMinimumModulePoints(actor) {
  let minPoints = 0;
  let modules = actor.items.filter((item) => item.type === "avd12module");
  modules.forEach((module) => {
    minPoints += actor.getSpentModulePoints(module);
  });
  return minPoints;
}

export async function updateModulePoints(actor, delta) {
  let modulePoints = actor.getTotalModulePoints() + delta;
  let level = Math.floor((modulePoints - (Number(actor.system.origin_trait) == 1 ? 4 : 0)) / 10);

  if (level !== actor.system.level.value) {
    await actor.update({ "system.level.value": level });
  }
  await actor.update({ "system.module_points": actor.system.module_points + delta });
}

export function getTotalModulePoints(actor) {
  let totalPoints = 0;
  let modules = actor.items.filter((item) => item.type == "avd12module");
  modules.forEach((module) => {
    totalPoints += actor.getSpentModulePoints(module);
  });
  return totalPoints + actor.system.module_points;
}

export function getSpentModulePoints(module) {
  let cost = 0;
  if (module.system.options && typeof module.system.options === "object") {
    Object.entries(module.system.options).forEach(([location, option]) => {
      if (option.selected) {
        if (module.system.origin && location === "option_1") {
        } else {
          cost += option.cost;
        }
      }
    });
  }
  return cost;
}

export async function updateModuleSelection(actor, item, location, selection) {
  let module = actor.items.filter((found) => found._id == item._id);
  if (module) {
    if (!Avd12Utility.isValidModuleOption(item, location)) {
      return;
    }
    let option = item.system.options[location];
    let oppositeLocation = Avd12Utility.GetOtherTier(location);
    if (selection) {
      item.system.options[location].selected = false;
      await Promise.all([actor.updateModulePoints(option.cost), item.update({ "system.options": item.system.options })]);
      return;
    }
    if (oppositeLocation) {
      if (item.system.options[oppositeLocation].selected) {
        item.system.options[location].selected = true;
        item.system.options[Avd12Utility.GetOtherTier(location)].selected = false;
        await item.update({ "system.options": item.system.options });
        return;
      }
    }
    if (actor.system.module_points >= option.cost) {
      item.system.options[location].selected = true;
      await Promise.all([actor.updateModulePoints(-option.cost), item.update({ "system.options": item.system.options })]);
      return;
    } else {
      ui.notifications.warn("Could not find the module");
    }
  }
}

export function rebuildModules(actor) {
  let baseTrait = {
    img: IMAGES["trait"],
    type: "temporary trait",
    name: "",
    system: {
      traittype: "origin",
      description: "",
      data: "",
    },
  };
  switch (actor.system.biodata.size) {
    case 2: //small;
      baseTrait.name = "Small Creature";
      baseTrait.system.description = "Small Creatures gain +1 Dodge and Stealth while having a -1 penalty to Movement Speed and Strength. They cannot wield Heavy Weapons and have a decreased carrying capacity.";
      break;
    case 3: //medium
      baseTrait.name = "Medium Creature";
      baseTrait.system.description = "Medium Creatures are standard size, gaining no penalties or bonuses.";
      break;
    case 4: //large
      baseTrait.name = "Large Creature";
      baseTrait.system.description =
        "Large creatures gain a +1 Strength and Block while having a -1 penalty to Stealth, Acrobatics and Dodge.They must consume 4 Meals per day to qualify for the benefits from a Full Rest. Additionally, they take up double the space of a normal creature but have an increased carrying capacity.";
      break;
  }

  actor.tmpTraits.push(baseTrait);

  let modules = actor.items.filter((item) => item.type == "avd12module");
  modules.forEach((module) => {
    Object.entries(module.system.options).forEach(([key, option]) => {
      const optionKey = key.replace("option_", "");
      if (module.system.avd12_id.length > 6) {
        option.custom = true;
      } else {
        option.custom = false;
      }

      if (option.selected) {
        option.avd12_id = `${module.system.avd12_id}_${optionKey}`;
        parseOption(actor, option);
      } else if (module.system.origin && (optionKey == "a" || optionKey == "b")) {
        option.avd12_id = `${module.system.avd12_id}_${optionKey}`;
        parseOption(actor, option);
      }
    });
  });
}
