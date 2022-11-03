import { Avd12Utility } from "./avd12-utility.js";

export const defaultItemImg = {
  skill: "systems/fvtt-avd12/images/icons/icon_skill.webp",
  armor: "systems/fvtt-avd12/images/icons/icon_armour.webp",
  weapon: "systems/fvtt-avd12/images/icons/icon_weapon.webp",
  equipment: "systems/fvtt-avd12/images/icons/icon_equipment.webp",
  money: "systems/fvtt-avd12/images/icons/icon_money.webp",
}

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class Avd12Item extends Item {

  constructor(data, context) {
    if (!data.img) {
      data.img = defaultItemImg[data.type];
    }
    super(data, context);
  }

}
