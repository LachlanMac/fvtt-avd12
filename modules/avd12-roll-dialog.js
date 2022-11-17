import { Avd12Utility } from "./avd12-utility.js";

export class Avd12RollDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData) {

    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/fvtt-avd12/templates/dialogs/roll-dialog-generic.html', rollData);

    return new CrucibleRollDialog(actor, rollData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, rollData, html, options, close = undefined) {
    let conf = {
      title: (rollData.mode == "skill") ? "Skill" : "Attribute",
      content: html,
      buttons: {
        roll: {
          icon: '<i class="fas fa-check"></i>',
          label: "Roll !",
          callback: () => { this.roll() }
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
    this.rollData = rollData;
  }

  /* -------------------------------------------- */
  roll() {
    Avd12Utility.rollAvd12(this.rollData)
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/fvtt-avd12/templates/dialogs/roll-dialog-generic.html", this.rollData)
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

    html.find('#advantage').change((event) => {
      this.rollData.advantage = event.currentTarget.value
    })
    html.find('#disadvantage').change((event) => {
      this.rollData.disadvantage = event.currentTarget.value
    })
    html.find('#rollAdvantage').change((event) => {
      this.rollData.rollAdvantage = event.currentTarget.value
    })
    html.find('#useshield').change((event) => {
      this.rollData.useshield = event.currentTarget.checked
    })
    html.find('#hasCover').change((event) => {
      this.rollData.hasCover = event.currentTarget.value
    })
    html.find('#situational').change((event) => {
      this.rollData.situational = event.currentTarget.value
    })
    html.find('#distanceBonusDice').change((event) => {
      this.rollData.distanceBonusDice = Number(event.currentTarget.value)
    })
    
  }
}