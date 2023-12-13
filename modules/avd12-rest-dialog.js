import { Avd12Utility } from "./avd12-utility.js";

export class Avd12RestDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor) {

    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/avd12/templates/dialogs/rest.hbs');
    return new Avd12RestDialog(actor, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, html, options, close = undefined) {
    let conf = {
      title: "Rest",
      content: html,
      buttons: {
        breather:{
          icon: '<i class="fas fa-check"></i>',
          label: "Take a Breather",
          callback: () => { this.breather() }
      },

        unfavorable:{
            icon: '<i class="fas fa-check"></i>',
            label: "Take Rest",
            callback: () => { this.unfavorableRest() }
        },
        favorable:{
            icon: '<i class="fas fa-check"></i>',
            label: "Take Favorable Rest",
            callback: () => { this.favorableRest() }
        }
      },
      close: close
    }

    super(conf, options);
    this.restData = {bonusHealth:0, bonusPower:0};
    this.actor = actor;
   
  }

  /* -------------------------------------------- */
  favorableRest() {
    this.actor.takeRest(this.restData, true);
  }
  unfavorableRest() {
    this.actor.takeRest(this.restData, false);
  }
  breather() {
    this.actor.takeBreather(this.restData);
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/avd12/templates/dialogs/rest.hbs", this.rollData)
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

    html.find('#bonus-health').change((event) => {
      this.restData.bonusHealth = event.currentTarget.value
    })
    html.find('#bonus-power').change((event) => {
      this.restData.bonusPower = event.currentTarget.value
    })

  }
}