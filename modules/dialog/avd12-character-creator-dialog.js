import { Avd12Utility } from "../avd12-utility.js";

export class AVD12CharacterCreatorDialog extends Dialog {
  static async create(actor, creationData) {
    let options = { classes: ["Avd12Dialog"], width: 680, height: "fit-content", "z-index": 99999 };
    let html = await renderTemplate("systems/avd12/templates/dialogs/create-character.hbs", creationData);
    return new AVD12CharacterCreatorDialog(actor, creationData, html, options);
  }

  constructor(actor, creationData, html, options, close = undefined) {
    let conf = {
      title: "Character Creation",
      content: html,
      buttons: {
        createBtn: {
          icon: '<i class="fas fa-check"></i>',
          label: "Create Character",
          callback: () => {
            this.createCharacter();
          },
        },
      },
      close: close,
    };
    super(conf, options);
    this.creationData = creationData;
    this.actor = actor;
    this.creationData.name = actor.name;
    this.creationData.selected_culture = creationData.cultures[0];
    this.creationData.selected = creationData.ancestries[0];
    this.creationData.secondary_selected = null;
    this.creationData.selected_plane = creationData.planar[0];
    this.creationData.originType = this.creationData.originType || 1;
  }

  createCharacter() {
    const dataPackage = {
      primary: this.creationData.selected,
      secondary: this.creationData.secondary_selected,
      plane: this.creationData.selected_plane,
      culture:this.creationData.selected_culture,
      origin: this.creationData.originType,
      name: $("#character-name").val(),
      size: this.creationData.sizeType,
      alteration: this.creationData.alteration,
      planar: this.creationData.planar,
      cultures: this.creationData.cultures,
      ancestries:this.creationData.ancestries
    };

    this.actor.confirmCreateCharacter(dataPackage);
  }

  async refreshDialog() {
    const content = await renderTemplate("systems/avd12/templates/dialogs/create-character.hbs", this.creationData);
    this.data.content = content;
    this.render(true);
    setTimeout(() => {
      this.setPosition({ height: "auto", width: 680 });
    }, 2);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#character-name").on("input", (event) => {
      this.creationData.name = $(event.currentTarget).val();
    });

    var dialog = this;
    function onLoad() {
      $("#character-name").val(dialog.creationData.name);
      $("#character-ancestry").val(dialog.creationData.selected._id);
      $("#size-description").text(dialog.creationData.size_description_map[dialog.creationData.sizeType]);
      $("#origin-description").text(dialog.creationData.origin_description_map[dialog.creationData.originType]);
      if(dialog.creationData.secondary_selected != null){
        $("#secondary-character-ancestry").val(dialog.creationData.secondary_selected._id);
        $("#secondary-ancestry-container").show();
      }else{
        $("#secondary-ancestry-container").hide();
      }

      $("#character-culture").val(dialog.creationData.selected_culture._id);

      $("#character-name").val(dialog.creationData.name);
      if ($("#origin").val() !== dialog.creationData.originType.toString()) {
        $("#origin").val(dialog.creationData.originType.toString()).change();
      }
    }

    $(function () {
      onLoad();
    });

    html.find("#origin").change((event) => {
      const selectedValue = Number($(event.currentTarget).val());
      if (selectedValue == this.creationData.originType) {
        return;
      } else {
        if (selectedValue == 4) {
          this.creationData.selected_plane = this.creationData.planar[0];
        }
        this.creationData.originType = selectedValue;
        this.refreshDialog();
      }
    });

    html.find("#size").change((event) => {
      const selectedValue = Number($(event.currentTarget).val());
      if (selectedValue == this.creationData.sizeType) {
        return;
      } else {
        this.creationData.sizeType = selectedValue;
        this.refreshDialog();
      }
    });

    html.find("#character-ancestry").change((event) => {
      const selectedId = $(event.currentTarget).val();
      const selectedAncestry = this.creationData.ancestries.find((ancestry) => ancestry._id === selectedId);
      if (selectedAncestry) {
        this.creationData.selected = selectedAncestry;
        $("#character-ancestry option:selected").text(selectedAncestry.name);
      }
      this.refreshDialog();
    });

    html.find("#character-culture").change((event) => {
      const selectedId = $(event.currentTarget).val();
      const selectedCulture = this.creationData.cultures.find((culture) => culture._id === selectedId);
      if (selectedCulture) {
        this.creationData.selected_culture = selectedCulture;
        $("#character-culture option:selected").text(selectedCulture.name);
      }
      this.refreshDialog();
    });

    html.find("#secondary-character-ancestry").change((event) => {
      const selectedId = $(event.currentTarget).val();
      const selectedAncestry = this.creationData.ancestries.find((ancestry) => ancestry._id === selectedId);
      if (selectedAncestry) {
        this.creationData.secondary_selected = selectedAncestry;
        $("#secondary-character-ancestry option:selected").text(selectedAncestry.name);
      }else if(selectedId == 0){
        this.creationData.secondary_selected = null;
        $("#secondary-character-ancestry option:selected").text("None");
      }
      this.refreshDialog();
    });

    html.find("#planar-character-ancestry").change((event) => {
      const selectedId = $(event.currentTarget).val();
      const selectedAncestry = this.creationData.planar.find((ancestry) => ancestry._id === selectedId);
      if (selectedAncestry) {
        this.creationData.planar_selected = selectedAncestry;
        $("#planar-character-ancestry option:selected").text(selectedAncestry.name);
      }
    });
  }
}
