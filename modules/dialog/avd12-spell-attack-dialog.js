import { Avd12Utility } from "../avd12-utility.js";

export class Avd12SpellAttackDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, spellData) {

    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/avd12/templates/dialogs/roll-spell-attack.hbs', spellData);
    return new Avd12SpellAttackDialog(actor, spellData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, spellData, html, options, close = undefined) {
    let conf = {
      content: html,
      buttons: {
        takeDamage: {
          icon: '<i class="fas fa-check"></i>',
          label: "Channel",
          callback: () => { this.channel() }
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
    this.spellData = spellData;
    this.userData = {powerModifier:0, attackModifier:0};
    this.userData.button = spellData.button;
  }

  /* -------------------------------------------- */
  channel() {
    this.actor.channelSpell(this.spellData, this.userData);
  }
  
  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/avd12/templates/dialogs/roll-spell-attack.hbs", this.spellData)
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

  
    html.find('#attack-modifier').change((event) => {
      this.userData.attackModifier = event.currentTarget.value;
    })
    
    html.find('#power-modifier').change((event) => {
      this.userData.powerModifier = event.currentTarget.value;
    })

  }
}