import { Avd12Utility } from "./avd12-utility.js";

const __ALLOWED_MODULE_TYPES = { "action": 1, "reaction": 1, "freeaction": 1, "trait": 1 }

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class Avd12ItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {

    return mergeObject(super.defaultOptions, {
      classes: ["fvtt-avd12", "sheet", "item"],
      template: "systems/fvtt-avd12/templates/item-sheet.hbs",
      dragDrop: [{ dragSelector: null, dropSelector: null }],
      width: 620,
      height: 550,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */
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

    // Specific case for formating descriptions of sub-items
    if (this.object.type == "module") {
      for (let level of this.object.system.levels) {
        for (let id in level.features) {
          level.features[id].descriptionHTML = await TextEditor.enrichHTML(level.features[id].system.description, { async: true })
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
      cssClass: this.isEditable ? "editable" : "locked",
      system: duplicate(this.object.system),
      limited: this.object.limited,
      options: this.options,
      owner: this.document.isOwner,
      bonusList: Avd12Utility.buildBonusList(),
      description: await TextEditor.enrichHTML(this.object.system.description, { async: true }),
      isGM: game.user.isGM
    }

    this.options.editable = !(this.object.origin == "embeddedItem");
    console.log("ITEM DATA", formData, this);
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
    let chatData = duplicate(CrucibleUtility.data(this.item));
    if (this.actor) {
      chatData.actor = { id: this.actor.id };
    }
    // Don't post any image for the item (which would leave a large gap) if the default image is used
    if (chatData.img.includes("/blank.png")) {
      chatData.img = null;
    }
    // JSON object for easy creation
    chatData.jsondata = JSON.stringify(
      {
        compendium: "postedItem",
        payload: chatData,
      });

    renderTemplate('systems/avd12/templates/post-item.html', chatData).then(html => {
      let chatOptions = CrucibleUtility.chatDataSetup(html);
      ChatMessage.create(chatOptions)
    });
  }

  /* -------------------------------------------- */
  async _onDrop(event) {

    const levelIndex = Number($(event.toElement).data("level-index"))
    const choiceIndex = Number($(event.toElement).data("choice-index"))
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
    if (this.object.type == "module" && __ALLOWED_MODULE_TYPES[item.type]) {
      let levels = duplicate(this.object.system.levels)
      levels[levelIndex].choices[choiceIndex].features[item.id] = duplicate(item)
      this.object.update({ 'system.levels': levels })
      return
    }
    ui.notifications.warn("This item is not allowed dropped here")
  }

  /* -------------------------------------------- */
  async viewSubitem(ev) {
    let field = $(ev.currentTarget).data('type');
    let idx = Number($(ev.currentTarget).data('index'));
    let itemData = this.object.system[field][idx];
    if (itemData.name != 'None') {
      let spec = await Item.create(itemData, { temporary: true });
      spec.system.origin = "embeddedItem";
      new Avd12ItemSheet(spec).render(true);
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
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;


    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.object.options.actor.getOwnedItem(li.data("item-id"));
      item.sheet.render(true);
    });

    html.find('.delete-subitem').click(ev => {
      this.deleteSubitem(ev);
    });

    // Update Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      let itemType = li.data("item-type");
    });

    html.find('.view-subitem').click(ev => {
      this.viewSubitem(ev);
    });

    html.find('.add-module-level').click(ev => {
      let levels = duplicate(this.object.system.levels)
      levels.push({ choices: [ {selected: false, features: {} }, {selected: false, features: {} } ] })
      this.object.update({ 'system.levels': levels })
    })

    html.find('.module-feature-delete').click(ev => {
      let levels = duplicate(this.object.system.levels)
      let levelIndex = Number($(ev.currentTarget).parents(".item").data("level-index"))
      let choiceIndex = Number($(ev.currentTarget).parents(".item").data("choice-index"))
      let featureId = $(ev.currentTarget).parents(".item").data("feature-id")
      levels[levelIndex].choices[choiceIndex].features[featureId] = undefined
      this.object.update({ 'system.levels': levels })
    })

    html.find('.choice-level-selected').change(ev => {
      let levels = duplicate(this.object.system.levels)
      let levelIndex = Number($(ev.currentTarget).parents(".item").data("level-index"))
      let choiceIndex = Number($(ev.currentTarget).parents(".item").data("choice-index"))
      for (let choice of levels[levelIndex].choices) {
        choice.selected = false // Everybody to false
      }
      levels[levelIndex].choices[choiceIndex].selected = ev.currentTarget.value
      this.object.update({ 'system.levels': levels })
    })
  }

  /* -------------------------------------------- */
  get template() {
    let type = this.item.type;
    return `systems/fvtt-avd12/templates/items/item-${type}-sheet.hbs`
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    return this.object.update(formData)
  }
}