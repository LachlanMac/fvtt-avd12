/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { Avd12Utility } from "./avd12-utility.js";

/* -------------------------------------------- */
export class Avd12NPCSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ["fvtt-avd12", "sheet", "actor"],
        template: "systems/fvtt-avd12/templates/actors/actor-sheet.hbs",
        width: 960,
        height: 740,
        tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }],
        dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
        editScore: true
      });
    }
    


    /* -------------------------------------------- */
    async getData() {
      let formData = {
        title: this.title,
        id: this.actor.id,
        bonuses: this.actor.system.bonus,
        type: this.actor.type,
        character: this.actor.type == "character",
        img: this.actor.img,
        name: this.actor.name,
        creatureSize: Avd12Utility.getSize(this.actor.system.biodata.size),
        creatureType: this.actor.system.creature_type,
        editable: this.isEditable,
        cssClass: this.isEditable ? "editable" : "locked",
        system: duplicate(this.object.system),
        limited: this.object.limited,
        modules: this.actor.getModules(),
        traits: this.actor.getNpcTraits(),
        actions: this.actor.getNpcActions(),
        reactions: this.actor.getNpcReactions(),
        freeactions: this.actor.getNpcFreeactions(),
        ballads: this.actor.getBallads(),
        weapons: this.actor.checkAndPrepareEquipments( duplicate(this.actor.getWeapons()) ),
        armors: this.actor.checkAndPrepareEquipments( duplicate(this.actor.getArmors())),
        shields: this.actor.checkAndPrepareEquipments( duplicate(this.actor.getShields())),
        spells: this.actor.checkAndPrepareEquipments( duplicate(this.actor.getSpells())),
        equipments: this.actor.checkAndPrepareEquipments(duplicate(this.actor.getEquipmentsOnly()) ),
        equippedWeapons: this.actor.checkAndPrepareEquipments(duplicate(this.actor.getEquippedWeapons()) ),
        equippedArmor: this.actor.getEquippedArmor(),
        equippedShield: this.actor.getEquippedShield(),
        craftingSkills: this.actor.getCraftingSkills(),
        subActors: duplicate(this.actor.getSubActors()),
        moneys: duplicate(this.actor.getMoneys()),
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
  
  
    /* -------------------------------------------- */
    /** @override */
    activateListeners(html) {
      super.activateListeners(html);
  
      // Everything below here is only needed if the sheet is editable
      if (!this.options.editable) return;
      
      html.bind("keydown", function(e) { // Ignore Enter in actores sheet
        if (e.keyCode === 13) return false;
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
  
      html.find('.use-action').click((event) => {
        const li = $(event.currentTarget).parents(".item");
        const actionId = li.data("item-id");
        this.actor.useAction(actionId)
      });

      

      html.find('.roll-skill').click((event) => {
        let attrKey = $(event.currentTarget).data("attr-key")
        let skillKey = $(event.currentTarget).data("skill-key")
        this.actor.rollSkill(attrKey, skillKey)
      });   
  
      html.find('.roll-spell').click((event) => {
        const li = $(event.currentTarget).parents(".item");
        this.actor.rollSpell( li.data("item-id") )
      });    
      html.find('.roll-crafting').click((event) => {
        const li = $(event.currentTarget).parents(".item");
        this.actor.rollCrafting( li.data("item-id") )
      });    
      html.find('.roll-universal').click((event) => {
        let skillKey = $(event.currentTarget).data("skill-key")
      
        this.actor.rollUniversal(skillKey)
      });    
      
      html.find('.roll-weapon').click((event) => {
        const li = $(event.currentTarget).parents(".item");
        const weponId = li.data("item-id")
        this.actor.rollWeapon(weponId, event.which)
      });
  
  
      html.find('.roll-weapon-damage').click((event) => {
        const li = $(event.currentTarget).parents(".item");
        const dmg = $(event.currentTarget).data("damage")
        const weaponId = li.data("item-id")
        this.actor.rollWeaponDamage(weaponId, dmg)
      });
      
      html.find('.roll-secondary-weapon-damage').click((event) => {
        const li = $(event.currentTarget).parents(".item");
        const dmg = $(event.currentTarget).data("damage")
        const weaponId = li.data("item-id")
        this.actor.rollSecondaryWeaponDamage(weaponId, dmg)
      });
  
      html.find('.roll-tertiary-weapon-damage').click((event) => {
        const li = $(event.currentTarget).parents(".item");
        const dmg = $(event.currentTarget).data("damage")
        const weaponId = li.data("item-id")
        this.actor.rollTertiaryWeaponDamage(weaponId, dmg)
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
  