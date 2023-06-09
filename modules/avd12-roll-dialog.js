import { Avd12Utility } from "./avd12-utility.js";

export class Avd12RollDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData) {
    let options = { classes: ["Avd12Dialog"], width: 540, height: 'fit-content', 'z-index': 99999 };
    let html = await renderTemplate('systems/fvtt-avd12/templates/dialogs/roll-dialog-generic.hbs', rollData);
    
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

    const reg = /(\d+d\d+)(?:\+(\d+))?/;
    const match = this.rollData.diceFormula.match(reg);
    if(match){
        let dice = match[1].split("d");
        let updatedDice = Number(dice[0]) + "d" + dice[1];;
        let modifier = 0;
        if(match[2]){
          modifier = Number(match[2]) * 2; // If there's no modifier, default to 0
          
        }
        if(critType == "brutal"){
            updatedDice = Number(dice[0]) * 2 + "d" + dice[1];
        }
        this.rollData.diceFormula = this.rollData.diceFormula.replace(match[0], updatedDice +"+" + modifier);
        
    }
  }

  /* -------------------------------------------- */
  roll(critical) {
    this.crit(critical);
    Avd12Utility.rollAvd12(this.rollData)
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/fvtt-avd12/templates/dialogs/roll-dialog-generic.hbs", this.rollData)
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