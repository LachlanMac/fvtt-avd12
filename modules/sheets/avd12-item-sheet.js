import { Avd12Utility } from "../avd12-utility.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class Avd12ItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["avd12", "sheet", "item"],
      template: "systems/avd12/templates/item-sheet.hbs",
      dragDrop: [{ dragSelector: null, dropSelector: null }],
      width: 620,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    // Add "Post to chat" button
    // We previously restricted this to GM and editable items only. If you ever find this comment because it broke something: eh, sorry!
    buttons.unshift(
      {
        class: "post",
        icon: "fas fa-comment",
        onclick: ev => { }
      })
    return buttons
  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    if (this.item.type.includes('weapon')) {
      position.width = 640;
    }
    return position;
  }

  /* -------------------------------------------- */
  async getData() {
    if (this.object.type == "module") {
      for (let level of this.object.system.levels) {
        if ( level && level.features) {
          for (let id in level.features) {
            if ( level.features[id] ) {
              level.features[id].descriptionHTML = await TextEditor.enrichHTML(level.features[id].system.description, { async: true })
            }
          }
        }
      }
    }
    let formData = {
      title: this.title,
      id: this.id,
      type: this.object.type,
      img: this.object.img,
      name: this.object.name,
      editable: this.isEditable,
      owned: this.document.parent,
      cssClass: this.isEditable ? "editable" : "locked",
      system: foundry.utils.duplicate(this.object.system),
      limited: this.object.limited,
      options: this.options,
      owner: this.document.isOwner,
      bonusList: Avd12Utility.buildBonusList(),
      description: await TextEditor.enrichHTML(this.object.system.description, { async: true }),
      isGM: game.user.isGM
    }
    // Specific focus case
    if (this.object.system.focus?.isfocus) {
      formData.focusData = Avd12Utility.computeFocusData( this.object.system.focus)
    }

    this.options.editable = !(this.object.origin == "embeddedItem");

    return formData;
  }


  /* -------------------------------------------- */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons.unshift({
      class: "post",
      icon: "fas fa-comment",
      onclick: ev => this.postItem()
    });
    return buttons
  }

  /* -------------------------------------------- */
  postItem() {

    let chatData = foundry.utils.duplicate(this.item)
    if (this.actor) {
      chatData.actor = { id: this.actor.id };
    }

    if (chatData.img.includes("/blank.png")) {
      chatData.img = null;
    }

    chatData.jsondata = JSON.stringify(
      {
        compendium: "postedItem",
        payload: chatData,
      });

    renderTemplate('systems/avd12/templates/post-item.html', chatData).then(html => {
      let chatOptions = Avd12Utility.chatDataSetup(html);
      ChatMessage.create(chatOptions)
    });
  }

  /* -------------------------------------------- */
  async _onDrop(event) {
    
    let li = $(event.toElement).parents(".item")
    const levelIndex = Number(li.data("level-index"))
    const choiceIndex = Number(li.data("choice-index"))
    let data = event.dataTransfer.getData('text/plain')
    let dataItem = JSON.parse(data)
    let item = fromUuidSync(dataItem.uuid)
    if (item.pack) {
      item = await Avd12Utility.searchItem(item)
    }
    if (!item) {
      ui.notifications.warn("Unable to find relevant item  - Aborting drag&drop " + data.uuid)
      return
    }
    if (this.object.type == "module" && Avd12Utility.isModuleItemAllowed(item.type) ) {
      let levels = foundry.utils.duplicate(this.object.system.levels)
      levels[levelIndex].choices[choiceIndex].features[item.id] = foundry.utils.duplicate(item)
      this.object.update({ 'system.levels': levels })
      return
    }
    ui.notifications.warn("This item is not allowed dropped here")
  }

  /* -------------------------------------------- */
  async viewSubitem(ev) {
    let levelIndex = Number($(ev.currentTarget).parents(".item").data("level-index"))
    let choiceIndex = Number($(ev.currentTarget).parents(".item").data("choice-index"))
    let featureId = $(ev.currentTarget).parents(".item").data("feature-id")
    
    let itemData = this.object.system.levels[levelIndex].choices[choiceIndex].features[featureId]

    if (itemData.name != 'None') {
      let item = await Item.create(itemData, { temporary: true });
      item.system.origin = "embeddedItem";
      new Avd12ItemSheet(item).render(true);
    }
  }

  /* -------------------------------------------- */
  async deleteSubitem(ev) {
    let field = $(ev.currentTarget).data('type');
    let idx = Number($(ev.currentTarget).data('index'));
    let oldArray = this.object.system[field];
    let itemData = this.object.system[field][idx];
    if (itemData.name != 'None') {
      let newArray = [];
      for (var i = 0; i < oldArray.length; i++) {
        if (i != idx) {
          newArray.push(oldArray[i]);
        }
      }
      this.object.update({ [`system.${field}`]: newArray });
    }
  }

  /* -------------------------------------------- */
  async processChoiceLevelSelection(ev) {
    let levels = foundry.utils.duplicate(this.object.system.levels)
    let levelIndex = Number($(ev.currentTarget).parents(".item").data("level-index"))
    let choiceIndex = Number($(ev.currentTarget).parents(".item").data("choice-index"))
    for (let choice of levels[levelIndex].choices) {
      choice.selected = false // Everybody to false
    }
    levels[levelIndex].choices[choiceIndex].selected = ev.currentTarget.checked

    //if there is an actor associated wit this?
    if ( this.object.actor ) {

      let obj = await this.object.actor.updateEmbeddedDocuments('Item', [{ _id: this.object.id, 'system.levels': levels }]);
      if ( ev.currentTarget.checked ) {
        this.object.actor.addModuleLevel( this.object.id, levels[levelIndex].choices[choiceIndex] )
      } else {
        this.object.actor.deleteModuleLevel( this.object.id, levels[levelIndex].choices[choiceIndex] )
      }
    } else {
      this.object.update({ 'system.levels': levels })
    }
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    


    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find('.toggle-module-option').click(ev => {
      if ( this.object.actor ) {
        const button = ev.currentTarget;
        const optionKey = button.dataset.option;
        const option = this.object.system.options[optionKey];
        const isSelected = option.selected;
        this.object.actor.updateModuleSelection(this.object, optionKey, isSelected);
      }
    })
         
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.object.options.actor.getOwnedItem(li.data("item-id"));
      item.sheet.render(true);
    });

    html.find('.delete-subitem').click(ev => {
      this.deleteSubitem(ev);
    });

    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      let itemType = li.data("item-type");
    });
  }

  /* -------------------------------------------- */
  get template() {
    let type = this.item.type;
    return `systems/avd12/templates/items/sheets/item-${type}-sheet.hbs`
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    return this.object.update(formData)
  }
}