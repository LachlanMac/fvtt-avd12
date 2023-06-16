import { Avd12Utility } from "./avd12-utility.js";

export class Avd12WeaponDamageDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, damageData) {

    console.log("XXXXX", damageData);
    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/fvtt-avd12/templates/dialogs/roll-weapon-damage.hbs', damageData);
    return new Avd12WeaponDamageDialog(actor, damageData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, data, html, options, close = undefined) {

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
    this.originalData = data;
    this.userData = {extraDamage:0, hitType:"normal", damageType: data.damageType};
  }

  /* -------------------------------------------- */
  confirmDamage() {
    this.actor.rollWeaponDamage(this.userData, this.originalData);
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/fvtt-avd12/templates/dialogs/roll-weapon-damage.hbs", this.rollData)
    this.data.content = content
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