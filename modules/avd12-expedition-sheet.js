/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { Avd12Utility } from "./avd12-utility.js";

/* -------------------------------------------- */
export class Avd12ExpeditionSheet extends ActorSheet {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
          classes: ["avd12", "sheet", "expedition"],
          template: "systems/avd12/templates/actors/expedition-sheet.hbs",
          width: 800,
          height: 280,
          tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }],
          dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
          editScore: true
        });
      }

      async getData() {
        let formData = {
          title: this.title,
          id: this.actor.id,
          type: this.actor.type,
          character: this.actor.type == "expedition",
          img: this.actor.img,
          name: this.actor.name,
          creatureType: this.actor.system.creature_type,
          editable: this.isEditable,
          cssClass: this.isEditable ? "editable" : "locked",
          system: duplicate(this.object.system),
          options: this.options,
          owner: this.document.isOwner,
        }
        this.formData = formData;
        return formData;
      }
        /** @override */
        setPosition(options = {}) {
            const position = super.setPosition(options);
            const sheetBody = this.element.find(".sheet-body");
            const bodyHeight = position.height - 192;
            sheetBody.css("height", bodyHeight);
            return position;
          }

              /* -------------------------------------------- */
    /** @override */
    _updateObject(event, formData) {
        // Update the Actor
        return this.object.update(formData);
      }
}