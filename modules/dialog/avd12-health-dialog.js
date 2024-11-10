import { Avd12Utility } from "../avd12-utility.js";

export class Avd12HealthDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, damageData) {

    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/avd12/templates/dialogs/roll-health-generic.hbs', damageData);
    return new Avd12HealthDialog(actor, damageData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, damageData, html, options, close = undefined) {
    let conf = {
      content: html,
      buttons: {
        takeDamage: {
          icon: '<i class="fas fa-check"></i>',
          label: "Calculate",
          callback: () => { this.confirmHealth() }
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
    this.damageData = {amount:0, recoveryType:"health"};
  }

  /* -------------------------------------------- */
  confirmHealth() {
    this.actor.confirmHealth(this.damageData);
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/avd12/templates/dialogs/roll-health-generic.hbs", this.rollData)
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


    html.find('#recovery-amount').change((event) => {
      this.damageData.amount = event.currentTarget.value
    })

    html.find('#recovery-type').change((event) => {
      this.damageData.recoveryType = event.currentTarget.value;
    })

  }
}