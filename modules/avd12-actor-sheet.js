/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { Avd12Utility } from "./avd12-utility.js";

/* -------------------------------------------- */
export class Avd12ActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["avd12", "sheet", "actor"],
      template: "systems/avd12/templates/actors/actor-sheet.hbs",
      width: 960,
      height: 740,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
      editScore: true
    });
  }

  async importData(){
    let uuid = this.actor.system.uuid;
    let actor = this.actor;
    await $.ajax({
      type: "GET",
      url: `https://anyventured12.com/foundryvtt/${uuid}`,
      //url: `https://localhost/foundryvtt/${uuid}`,
      dataType:"json",
      success: function (data) {
        actor.importData(data)
      },
      error: function (jqXHR, textStatus, errorThrown) {
          console.log(jqXHR.responseText);
          console.log(textStatus); //returns error
          console.log(errorThrown); //returns bad request
      }
    });
  }

  /* -------------------------------------------- */
  async getData(options) {
    let formData = {
      hpOverlayCalculationCurrent1: this.actor.getHealthPercentage().primary,
      hpOverlayCalculationCurrent2: this.actor.getHealthPercentage().secondary,
      powerOverlayCalculationCurrent1: this.actor.getPowerPercentage().primary,
      powerOverlayCalculationCurrent2: this.actor.getPowerPercentage().secondary,
      hasFocusEquipped : this.actor.hasFocusEquipped(),
      title: this.title,
      id: this.actor.id,
      created:this.actor.system.created,
      bonuses: this.actor.system.bonus,
      type: this.actor.type,
      img: this.actor.img,
      name: this.actor.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      system: foundry.utils.duplicate(this.object.system),
      limited: this.object.limited,
      total_module_points:this.actor.getTotalModulePoints(),
      modules: this.actor.getModules(),
      origin_modules: this.actor.getOriginModules(this.actor.getModules()),
      core_modules: this.actor.getCoreModules(this.actor.getModules()),
      secondary_modules: this.actor.getSecondaryModules(this.actor.getModules()),
      traits: this.actor.getTraits(),
      craftingTraits: this.actor.getCraftingTraits(),
      character: this.actor.type == "character",
      actions: this.actor.getActions(),
      reactions: this.actor.getReactions(),
      freeactions: this.actor.getFreeActions(),
      ballads: this.actor.getBallads(),
      ammunition:this.actor.getAmmunition(),
      light_sources:this.actor.getLightSources(),
      stances: this.actor.getStances(),
      gloves: this.actor.getGloves(),
      rings: this.actor.getRings(),
      cloaks:this.actor.getCloaks(),
      boots: this.actor.getBoots(),
      headwear: this.actor.getHeadwear(),
      weapons: this.actor.getWeapons(),
      armors: this.actor.getArmors(),
      shields:this.actor.getShields(),
      beginnerSpells: this.actor.getBeginnerSpells(foundry.utils.duplicate(this.actor.getSpells())),
      noviceSpells: this.actor.getNoviceSpells(foundry.utils.duplicate(this.actor.getSpells())),
      journeymanSpells: this.actor.getJourneymanSpells(foundry.utils.duplicate(this.actor.getSpells())),
      expertSpells: this.actor.getExpertSpells(foundry.utils.duplicate(this.actor.getSpells())),
      masterSpells: this.actor.getMasterSpells(foundry.utils.duplicate(this.actor.getSpells())),
      grandmasterSpells: this.actor.getGrandmasterSpells(foundry.utils.duplicate(this.actor.getSpells())),
      equipments: foundry.utils.duplicate(this.actor.getEquipmentsOnly()),
      equippedWeapons: foundry.utils.duplicate(this.actor.getEquippedWeapons()),
      equippedThrowing: foundry.utils.duplicate(this.actor.getThrowingEquipment()),
      equippedArmor: this.actor.getEquippedArmor(),
      equippedShield: this.actor.getEquippedShield(),
      subActors: foundry.utils.duplicate(this.actor.getSubActors()),
      moneys: foundry.utils.duplicate(this.actor.getMoneys()),
      focusData: this.actor.computeFinalFocusData(),
      encCurrent: this.actor.encCurrent,
      options: this.options,
      owner: this.document.isOwner,
      editScore: this.options.editScore,
      isGM: game.user.isGM
    }
    this.formData = formData;
    return formData;
  }
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;
    let shift = false;
    $(document).keydown(function(e) {
      if(e.which === 16)
        shift = true;
    })
    $(document).keyup(function(e) {
      if(e.which === 16)
        shift = false;
    })
    html.bind("keydown", function(e) { // Ignore Enter in actores sheet
      if (e.keyCode === 13) return false;

    });  
    html.find('#rest-display').click(ev => {
      this.actor.rest();
    });    
    html.find('#essence-burn-icon').click(ev => {
      this.actor.essenceBurn();
    });    

    html.find('#create-character').click(ev =>{
      this.actor.createCharacter();
      
    });

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item")
      let itemId = li.data("item-id")
      const item = this.actor.items.get( itemId );
      item.sheet.render(true);
    });
    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item")
      Avd12Utility.confirmDelete(this, li)
    })
    html.find('.item-add').click(ev => {
      let dataType = $(ev.currentTarget).data("type")
      this.actor.createEmbeddedDocuments('Item', [{ name: "NewItem", type: dataType }], { renderSheet: true })
    })
    html.find('.subactor-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let actorId = li.data("actor-id");
      let actor = game.actors.get( actorId );
      actor.sheet.render(true);
    });
    html.find('.subactor-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let actorId = li.data("actor-id");
      this.actor.delSubActor(actorId);
    });

    html.find('.quantity-change').change(event => {
      const li = $(event.currentTarget).parents(".item");
      const ct = event.currentTarget;
      this.actor.inChangeQuantity( li.data("item-id"), event.currentTarget.value);
    } );



    html.find('.quantity-minus').click(event => {
      const li = $(event.currentTarget).parents(".item");
      this.actor.incDecQuantity( li.data("item-id"), -1 );
    } );
    html.find('.quantity-plus').click(event => {
      const li = $(event.currentTarget).parents(".item");
      this.actor.incDecQuantity( li.data("item-id"), +1 );
    } );
    html.find('.ammo-minus').click(event => {
      const li = $(event.currentTarget).parents(".item")
      this.actor.incDecAmmo( li.data("item-id"), -1 );
    } );

    html.find('.ammo-plus').click(event => {
      const li = $(event.currentTarget).parents(".item")
      this.actor.incDecAmmo( li.data("item-id"), +1 )
    } );
    html.find('#take-damage-btn').click((event) => {
      this.actor.takeDamage();
    });

    html.find('#add-damage-btn').click((event) => {
      this.actor.takeDamage();
    });

    html.find('#add-health-btn').click((event) => {
      this.actor.addHealth();
    });

    html.find("#change-module-points").change(event => {
      let value = Number(event.currentTarget.value);
      this.actor.updateModulePoints(value - this.actor.system.module_points);
    });


    html.find('.roll-skill').click((event) => {
      let attrKey = $(event.currentTarget).data("attr-key")
      let skillKey = $(event.currentTarget).data("skill-key")
      this.actor.rollSkill(attrKey, skillKey, shift)
    });   
    html.find('.change-stance').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      this.actor.changeStance( li.data("item-id") )
    });    
    html.find('.roll-spell').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      this.actor.rollSpell( li.data("item-id"), shift)
    });    
    html.find('.roll-spell-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      this.actor.rollSpellDamage( li.data("item-id"), shift)
    });    

    html.find('.roll-craft').click((event) => {
      let skillKey = $(event.currentTarget).data("skill-key")
      this.actor.rollCrafting(skillKey, shift)
    });    

    html.find('.roll-universal').click((event) => {
      let skillKey = $(event.currentTarget).data("skill-key")
      this.actor.rollUniversal(skillKey, shift)
    });    
    html.find('.roll-throw-object').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weponId = li.data("item-id")
      this.actor.rollThrowObject(weponId, shift)
    });
    html.find('.roll-weapon').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weponId = li.data("item-id")
      this.actor.rollWeapon(weponId, shift)
    });
    html.find('#import-character').click(async (event) => {
      html.find("#import-character").disabled = true;
      await this.importData("TEST").then(()=>{
        html.find("#import-character").disabled = false;
      });
    });
    
    html.find('.use-action').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const actionId = li.data("item-id");
      this.actor.useAction(actionId)
    });

    html.find('.use-spell').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const spellId = li.data("item-id");
      this.actor.useSpell(spellId)
    });

    html.find('.roll-weapon-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weaponId = li.data("item-id")
      this.actor.showWeaponDamageDialog(weaponId, "normal", shift)
    });

    html.find('.roll-throw-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weaponId = li.data("item-id")
      this.actor.showWeaponDamageDialog(weaponId, "throw", shift)
    });

    html.find('.roll-thrown-weapon-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weaponId = li.data("item-id")
      this.actor.showWeaponDamageDialog(weaponId, "thrown", shift)
    });

    html.find('.roll-secondary-weapon-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weaponId = li.data("item-id")
      this.actor.rollSecondaryWeaponDamage(weaponId, "secondary", shift)
    });
    html.find('.roll-tertiary-weapon-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weaponId = li.data("item-id")
      this.actor.rollTertiaryWeaponDamage(weaponId, "tertiary", shift)
    });
    html.find('.lock-unlock-sheet').click((event) => {
      this.options.editScore = !this.options.editScore;
      this.render(true);
    });    
    html.find('.item-link a').click((event) => {
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.getOwnedItem(itemId);
      item.sheet.render(true);
    });    
    html.find('.item-equip').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.equipItem( li.data("item-id") );
      this.render(true);      
    });
    html.find('.update-field').change(ev => {
      const fieldName = $(ev.currentTarget).data("field-name");
      let value = Number(ev.currentTarget.value);
      this.actor.update( { [`${fieldName}`]: value } );
    });    


  }
  
  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */
  async _onDropItem(event, dragData) {
    const item = fromUuidSync(dragData.uuid)
    let itemFull
    if (item == undefined) {
      itemFull = this.actor.items.get( dragData.uuid )
    } else {
      if (item && item.system) {
        itemFull = item
      } else {
        itemFull = await Avd12Utility.searchItem( item )
      }
    }
    let ret = await this.actor.preprocessItem( event, itemFull, true )
    if ( ret ) {
      super._onDropItem(event, dragData)
    }
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    // Update the Actor
    return this.object.update(formData);
  }
}
