import { Avd12Utility } from "./avd12-utility.js";

export const defaultItemImg = {
  skill: "systems/fvtt-avd12/images/icons/skill1.webp",
  armor: "systems/fvtt-avd12/images/icons/chest2.webp",
  shield: "systems/fvtt-avd12/images/icons/shield2.webp",
  weapon: "systems/fvtt-avd12/images/icons/weapon2.webp",
  equipment: "systems/fvtt-avd12/images/icons/cloak2.webp",
  module: "systems/fvtt-avd12/images/icons/focus2.webp",
  money: "systems/fvtt-avd12/images/icons/focus2.webp",
  spell: "systems/fvtt-avd12/images/icons/spell1.webp",
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
