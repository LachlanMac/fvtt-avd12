import { Avd12Utility } from "../avd12-utility.js";

export class Avd12WeaponDamageDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, weapon) {
    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/avd12/templates/dialogs/roll-weapon-damage.hbs', weapon);
    return new Avd12WeaponDamageDialog(actor, weapon, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, weapon, html, options, close = undefined) {

    let conf = {
      options:{id:"weaponDamageDialog"},
      content: html,
      buttons: {
        normalDamage: {
          icon: '<i class="fas fa-check"></i>',
          label: "Normal",
          callback: () => { this.confirmDamage(0) }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => { this.close() }
        }
      },
      close: close
    }
    super(conf, options);
    this.actor = actor;
    this.weapon = weapon;
    this.userData = {extraDamage:0, hitType:"normal", damageType: "physical"};
  }

  /* -------------------------------------------- */
  confirmDamage() {
    this.actor.rollWeaponDamage(this.userData, this.weapon);
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/avd12/templates/dialogs/roll-weapon-damage.hbs", this.weapon)
    this.data.content = this.weapon
    this.render(true)
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    var dialog = this;
    function onLoad() {
    }
    $(function () { onLoad(); });

  
    html.find('#extra-damage').change((event) => {
      this.userData.extraDamage = event.currentTarget.value
    })

    html.find('#hit-type').change((event) => {
      this.userData.hitType = event.currentTarget.value
    })

    html.find('#damage-type').change((event) => {
      this.userData.damageType = event.currentTarget.value;
    })

  }
}