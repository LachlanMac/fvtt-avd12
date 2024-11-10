import { Avd12Utility } from "../avd12-utility.js";

export class Avd12DamageDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, damageData) {

    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/avd12/templates/dialogs/roll-damage-generic.hbs', damageData);
    return new Avd12DamageDialog(actor, damageData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, damageData, html, options, close = undefined) {
    let conf = {
      content: html,
      buttons: {
        takeDamage: {
          icon: '<i class="fas fa-check"></i>',
          label: "Calculate",
          callback: () => { this.confirmDamage() }
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
    this.damageData = {damageModifier:0, totalDamage:0, damageType:"Physical"};
  }

  /* -------------------------------------------- */
  confirmDamage() {
    this.actor.confirmDamage(this.damageData);
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/avd12/templates/dialogs/roll-damage-generic.hbs", this.rollData)
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

  
    html.find('#damage-modifier').change((event) => {
      this.damageData.damageModifier = event.currentTarget.value
    })

    html.find('#total-damage').change((event) => {
      this.damageData.totalDamage = event.currentTarget.value
    })

    html.find('#damage-type').change((event) => {
      this.damageData.damageType = event.currentTarget.value;
    })

  }
}