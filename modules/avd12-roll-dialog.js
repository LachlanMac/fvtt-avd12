import { Avd12Utility } from "./avd12-utility.js";

export class Avd12RollDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData) {
    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/avd12/templates/dialogs/roll-dialog-generic.hbs', rollData);
    
    return new Avd12RollDialog(actor, rollData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, rollData, html, options, close = undefined) {
    let conf = {
      title: (rollData.mode == "skill") ? "Skill" : "Roll",
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
   
    if(rollData.action){
      if(rollData.action.type == "damage"){
        conf.buttons = {};
        conf.buttons.roll = {
          icon: '<i class="fas fa-check"></i>',
          label: "Roll !",
          callback: () => { this.roll() }
        };
        switch(rollData.action.system.crit_level){
          case "normal":
            break;
          case "crit":
            conf.buttons.critical = {
              icon: '<i class="fas fa-check"></i>',
              label: "Critical !",
              callback: () => { this.roll("critical") }
            };
            break;
          case "brutal":
            conf.buttons.brutal = {
              icon: '<i class="fas fa-check"></i>',
              label: "Brutal Critical !",
              callback: () => { this.roll("brutal") }
            };
            break;
        }
        conf.buttons.cancel = {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => { this.close() }
        };
      }
  }

    super(conf, options);
    this.actor = actor;
    this.rollData = rollData;
  }

  crit(critType){
    if(!critType)
      return

    this.rollData.diceFormula = this.actor.santizeFormula(this.rollData.diceFormula);
    let diceTokens = this.rollData.diceFormula.split("+");
    let diceNumber = diceTokens[0].split("d")[0];
    let diceSize = diceTokens[0].split("d")[1]
    let modifier = diceTokens[1] * 2;
    if(critType == "brutal")
      diceNumber = diceNumber * 2;
    this.rollData.diceFormula = diceNumber + "d" + diceSize + " + " + modifier;

    if(diceTokens.length > 2){
      for(let i = 2; i < diceTokens.length; i++){
        this.rollData.diceFormula += " + " + diceTokens[i];
      }
    }
  }

  /* -------------------------------------------- */
  roll(critical) {
    this.crit(critical);
    Avd12Utility.rollAvd12(this.rollData)
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/avd12/templates/dialogs/roll-dialog-generic.hbs", this.rollData)
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

    html.find('#bonusMalusRoll').change((event) => {
      this.rollData.bonusMalusRoll = event.currentTarget.value
    })
    html.find('#targetCheck').change((event) => {
      this.rollData.targetCheck = event.currentTarget.value
    })



  }
}