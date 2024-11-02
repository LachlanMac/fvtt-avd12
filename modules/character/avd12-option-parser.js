export function parseOption(actor, option){
    if(!option.data){
        console.log("No data for:",option.name, option.data);
        return;
    }
    let dataTokens = option.data.split(":");
    let name = option.name;
    let description = option.description;

    if(dataTokens.length == 0){
        return;
    }
    
    for (let i in dataTokens) {
        switch (dataTokens[i].charAt(0)) {
            case "A":
                switch (dataTokens[i].charAt(1)) {
                    case "S": // Skill
                        addSkill(actor, dataTokens[i]);
                        break;
                    case "Z": // Weapon skill
                        addAttackSkill(actor, dataTokens[i]);
                        break;
                    case "H": // Health
                        addHealth(actor, dataTokens[i]);
                        break;
                    case "V": // Move speed
                        addMovespeed(actor, dataTokens[i]);
                        break;
                    case "D": // Defense
                        addDefense(actor, dataTokens[i]);
                        break;
                    case "C": // Crafting
                        addCraftingSkill(actor, dataTokens[i]);
                        break;
                    case "L": // Language
                        addLanguageSkill(actor, dataTokens[i]);
                        break;
                    default:
                        break;
                }
                break;
            case "L": // Placeholder for L-type logic if needed
                break;
            case "W": // When clause
                handleWhenClause(actor, dataTokens[i]);
                break;
            case "T": // Trait
                addTrait(actor, dataTokens[i], description, name);
                break;
            case "X": // Action
                addAction(actor, name, description,option.avd12_id);
                break;
            case "Z": // Reaction
                addReaction(actor, name, description,option.avd12_id);
                break;
            case "Y": // Free action
                addFreeAction(actor, name, description,option.avd12_id);
                break;
            case "H": // Fighting stance
                addFightingStance(actor, dataTokens[i]);
                break;
            case "B": // Ballad
                if (dataTokens[i].charAt(1) === "S") {
                    let data = dataTokens[i].split("=")[1];
                    addBallad(actor, data.split(";")[0], data.split(";")[1]);
                } else {
                    addBallad(actor, name, description);
                }
                break;
            case "F": // Conduit skills
                addConduitSkill(actor, dataTokens[i]);
                break;
            case "O": // Ranged skill
                addRangedSkill(actor, dataTokens[i]);
                break;
            case "I": // Immunity
                addImmunity(actor, dataTokens[i]);
                break;
            case "J": // Custom trait
                addCustomTrait(actor, {
                    name: dataTokens[i].split("-")[0].split("=")[1],
                    description: dataTokens[i].split("-")[1]
                });
                break;
            default:
                break;
        }
    }
}

function addSkill(actor, data) {
    let skillValue = Number(data.split("=")[1]);
    let skillCode = data.charAt(2);
    const skillMap = {
        "1": "attributes.might.skills.athletics.finalvalue",
        "2": "attributes.might.skills.block.finalvalue",
        "3": "attributes.agility.skills.acrobatics.finalvalue",
        "4": "attributes.agility.skills.stealth.finalvalue",
        "5": "attributes.willpower.skills.concentration.finalvalue",
        "6": "attributes.willpower.skills.resilience.finalvalue",
        "7": "attributes.knowledge.skills.arcanum.finalvalue",
        "8": "attributes.knowledge.skills.medicine.finalvalue",
        "9": "attributes.knowledge.skills.academic.finalvalue",
        "A": "attributes.knowledge.skills.thievery.finalvalue",
        "B": "attributes.knowledge.skills.wilderness.finalvalue",
        "C": "attributes.social.skills.persuasion.finalvalue",
        "D": "attributes.social.skills.insight.finalvalue",
        "E": "attributes.social.skills.performance.finalvalue",
        "F": "attributes.social.skills.animals.finalvalue",
        "G": "universal.skills.search.finalvalue",
        "H": "universal.skills.initiative.finalvalue"
    };
    let path = skillMap[skillCode];
    if (path) {
        // Split path and traverse the object
        path.split('.').reduce((obj, key, index, arr) => {
            if (index === arr.length - 1) {
                obj[key] += skillValue;
            }
            return obj[key];
        }, actor.system);
    } else {
        console.log("Unrecognized skill code:", skillCode);
    }
}

function addDefense(actor, data) {
    let skillValue = Number(data.split("=")[1]);
    let defenseCode = data.charAt(2);
    const mitigationMap = {
        "1": "attributes.willpower.skills.resistance.modifier",
        "2": "attributes.agility.skills.dodge.modifier",
        "3": "attributes.might.skills.block.modifier",
        "4": "mitigation.physical.value",
        "5": "mitigation.cold.value",
        "6": "mitigation.fire.value",
        "7": "mitigation.dark.value",
        "8": "mitigation.divine.value",
        "9": "mitigation.psychic.value",
        "A": ["mitigation.fire.value", "mitigation.cold.value", "mitigation.lightning.value"],
        "B": "mitigation.lightning.value",
        "C": "mitigation.arcane.value",
        "Z": "cast_penalty"
    };
    let path = mitigationMap[defenseCode];
    if (!path) return;
    if (Array.isArray(path)) {
        path.forEach(p => {
            p.split('.').reduce((obj, key, index, arr) => {
                if (index === arr.length - 1) obj[key] += skillValue;
                return obj[key];
            }, actor.system);
        });
    } else if (defenseCode === "Z") {
        actor.system.focus.castpenalty -= 1;
    } else {
        // For single-path cases
        path.split('.').reduce((obj, key, index, arr) => {
            if (index === arr.length - 1) obj[key] += skillValue;
            return obj[key];
        }, actor.system);
    }
}

function addConduitSkill(character, data) {
    const value = parseInt(data.split("=")[1]);
    switch (data.charAt(1)) {
        case "P":
            character.system.focus.focuspoints += value;
            break;
        case "R":
            character.system.focus.focusregen += value;
            break;
    }
}

function addAttackSkill(actor, data) {
    let attackValue = Number(data.split("=")[1]);
    let attackCode = data.charAt(2);
    const attackMap = {
        "1": "bonus.weapon.attack",
        "2": "bonus.spell.attack",
        "3": "bonus.weapon.damage",
        "4": "bonus.spell.damage",
        "5": "bonus.ranged.attack",
        "6": "bonus.slash.attack",
        "7": "bonus.blunt.attack",
        "8": "bonus.pierce.attack",
        "9": "bonus.ranged.damage",
        "A": "bonus.slash.damage",
        "B": "bonus.blunt.damage",
        "C": "bonus.pierce.damage",
        "D": "bonus.unarmed.crits",
        "E": "bonus.slash.crits",
        "F": "bonus.blunt.crits",
        "G": "bonus.pierce.crits",
        "H": "bonus.ranged.crits",
        "I": "bonus.ranged.brutals",
        "J": "bonus.slash.brutals",
        "K": "bonus.blunt.brutals",
        "L": "bonus.pierce.brutals",
        "M": "bonus.unarmed.attack",
        "N": "bonus.unarmed.damage",
        "O": "bonus.unarmed.brutals",
        "P": "bonus.unarmed.upgraded",
        "R": "bonus.traits.armsman",
        "W": "bonus.slash.upgraded",
        "X": "bonus.blunt.upgraded",
        "Y": "bonus.pierce.upgraded",
        "Z": "bonus.ranged.upgraded",
    };
    if (attackCode === "T") {
        addAttackOfOpportunity(actor, data, "Slasher");
        return;
    } else if (attackCode === "U") {
        addAttackOfOpportunity(actor, data, "Crusher");
        return;
    } else if (attackCode === "V") {
        addAttackOfOpportunity(actor, data, "Piercer");
        return;
    }
    let path = attackMap[attackCode];
    if (!path) return;
    if (attackCode >= "D" && attackCode <= "Z" && typeof path === 'string') {
        // Boolean flags for criticals and brutals
        let keys = path.split('.');
        keys.reduce((acc, key, index) => {
            if (index === keys.length - 1) acc[key] = true;
            return acc[key];
        }, actor.system);
    } else {
        // Numerical bonus adjustments
        path.split('.').reduce((obj, key, index, arr) => {
            if (index === arr.length - 1) obj[key] += attackValue;
            return obj[key];
        }, actor.system);
    }
}

function addMovespeed(actor, data) {
    let speedValue = Number(data.split("=")[1]);
    actor.system.movement.walk.value += speedValue;
}

function addHealth(actor, data) {
    let healthValue = Number(data.split("=")[1]);
    actor.system.health.max = healthValue;
}

function addCraftingSkill(actor, data) {
    const skillValue = Number(data.split("=")[1]);
    const craftingCode = data.charAt(2);
    const craftMap = {
        "1": "craft.smithing",
        "2": "craft.cooking",
        "3": "craft.scribing",
        "4": "craft.runecarving",
        "5": "craft.alchemy",
        "6": "craft.ammocraft",
        "7": "craft.engineering",
        "A": "all"
    };
    if (craftingCode === "A") {
        // Increment all crafting skills by skillValue
        Object.keys(actor.system.bonus.craft).forEach(skill => {
            actor.system.bonus.craft[skill] += skillValue;
        });
    } else {
        // Increment specified crafting skill by skillValue
        const skillPath = craftMap[craftingCode];
        if (skillPath) {
            skillPath.split('.').reduce((obj, key, index, arr) => {
                if (index === arr.length - 1) obj[key] += skillValue;
                return obj[key];
            }, actor.system.bonus);
        }
    }
}

function handleWhenClause(character, data) {
    console.log("----------------",data);
    if (data.charAt(1) === "5") {
        addShieldClause(character, data);
    } else {
        addArmorClause(character, data);
    }
}

function addArmorClause(character, data) {
    const option = data.charAt(1);
    const value = Number(data.split("=")[1]);
    switch (option) {
        case "0": // unarmored
            switch (data.charAt(3)) {
                case "1":
                    character.system.bonus.when.unarmored.resist += value;
                    break;
                case "2":
                    character.system.bonus.when.unarmored.dodge += value;
                    break;
                case "3":
                    character.system.bonus.when.unarmored.block += value;
                    break;
                case "4":
                    character.system.bonus.when.unarmored.physical += value;
                    break;
                case "A":
                    character.system.bonus.when.unarmored.elemental += value;
                    break;
                case "R":
                    character.system.bonus.when.unarmored.remove_penalties = true;
                    break;
                case "Y":
                    character.system.bonus.when.unarmored.remove_stealth_penalty = true;
                    break;
                case "Z":
                    character.system.bonus.when.unarmored.cast_penalty -= value;
                    break;
            }
            break;

        case "1": // light armor
            switch (data.charAt(3)) {
                case "1":
                    character.system.bonus.when.light_armor.resist += value;
                    break;
                case "2":
                    character.system.bonus.when.light_armor.dodge += value;
                    break;
                case "3":
                    character.system.bonus.when.light_armor.block += value;
                    break;
                case "4":
                    character.system.bonus.when.light_armor.physical += value;
                    break;
                case "A":
                    character.system.bonus.when.light_armor.elemental += value;
                    break;
                case "R":
                    character.system.bonus.when.light_armor.remove_penalties = true;
                    break;
                case "Y":
                    character.system.bonus.when.light_armor.remove_stealth_penalty = true;
                    break;
                case "Z":
                    character.system.bonus.when.light_armor.cast_penalty -= value;
                    break;
            }
            break;
        case "2": //armored
        case "3":
        case "4":
            switch (data.charAt(3)) {
                case "1":
                    character.system.bonus.when.armored.resist += value;
                    break;
                case "2":
                    character.system.bonus.when.armored.dodge += value;
                    break;
                case "3":
                    character.system.bonus.when.armored.block += value;
                    break;
                case "4":
                    character.system.bonus.when.armored.physical += value;
                    break;
                case "A":
                    character.system.bonus.when.armored.elemental += value;
                    break;
                case "B":
                    character.system.bonus.when.armored.move += value;
                    break;
                case "R":
                    character.system.bonus.when.armored.remove_penalties = true;
                    break;
                case "Y":
                    character.system.bonus.when.armored.remove_stealth_penalty = true;
                    break;
                case "Z":
                    character.system.bonus.when.armored.cast_penalty -= value;
                    break;
            }
            break;
    }
}

function addShieldClause(character, data) {
    const value = Number(data.split("=")[1]);
    const keyMap = {
        "1": "resist",
        "2": "dodge",
        "3": "block",
        "4": "physical",
        "A": "elemental",
        "R": "remove_penalties"
    };
    const key = keyMap[data.charAt(3)];
    if (key) {
        if (key === "remove_penalties") {
            character.system.bonus.when.shield[key] = true;
        } else {
            character.system.bonus.when.shield[key] += value;
        }
    }
}

function addRangedSkill(character, data) {
    const value = parseInt(data.split("=")[1]);
    const keyMap = {
        "1": "max_range_bonus_ulight",
        "2": "max_range_bonus_light",
        "3": "max_range_bonus_heavy",
        "4": "max_range_bonus_uheavy",
        "5": "min_range_bonus_ulight",
        "6": "min_range_bonus_light",
        "7": "min_range_bonus_heavy",
        "8": "min_range_bonus_uheavy",
        "9": ["max_range_bonus_ulight", "max_range_bonus_light", "max_range_bonus_heavy"]
    };
    const key = keyMap[data.charAt(1)];
    if (Array.isArray(key)) {
        key.forEach(k => character.system.bonus.ranged[k] += value);
    } else if (key) {
        character.system.bonus.ranged[key] += value;
    }
}

function addLanguageSkill(actor, data) {
    // Implement language skill-adding logic here
    console.log(`Adding language skill to ${actor.name} with data:`, data);
}

function addTrait(actor, data, description, name) {
    // Implement trait-adding logic here
    console.log(`Adding trait to ${actor.name} with name: ${name}, description: ${description}, data:`, data);
}

function addAction(actor, name, description, custom_id) {
    // Check if an action with this custom ID already exists

    /*
    const existingAction = actor.items.find(item =>
        item.type === "action" &&
        item.system.custom &&
        item.system.avd12_id === custom_id
    );
        if (existingAction) {
        console.log(`Action with custom ID ${custom_id} already exists. Skipping.`);
        return;
    }
    */
    // Define the new action data structure based on the given template
    let newActionData = getBaseAbility(name, description, custom_id, "action");
    actor.tmpActions.push(newActionData);
    console.log(`Added new action to ${actor.name} with custom ID ${custom_id}`);
}



function addReaction(actor, name, description, custom_id) {
    let newActionData = getBaseAbility(name, description, custom_id, "reaction");
    actor.tmpReactions.push(newActionData);
    console.log(`Adding reaction to ${actor.name} with name: ${name}, description: ${description}`);
}

function addFreeAction(actor, name, description, custom_id) {
    // Implement free action-adding logic here
    let newActionData = getBaseAbility(name, description, custom_id, "freeaction");
    actor.tmpFreeActions.push(newActionData);
    console.log(`Adding free action to ${actor.name} with name: ${name}, description: ${description}`);
}

function addFightingStance(actor, data) {
    // Implement fighting stance-adding logic here
    console.log(`Adding fighting stance to ${actor.name} with data:`, data);
}

function addBallad(actor, title, details) {
    // Implement ballad-adding logic here
    console.log(`Adding ballad to ${actor.name} with title: ${title}, details: ${details}`);
}

function addAttackOfOpportunity(actor, data, type){

}

function addImmunity(actor, dataTokens) {
    // Implement immunity-adding logic here
    console.log(`Adding immunity to ${actor.name} with data tokens:`, dataTokens);
}

function addCustomTrait(actor, { name, description }) {
    // Implement custom trait-adding logic here
    console.log(`Adding custom trait to ${actor.name} with name: ${name}, description: ${description}`);
}

function getBaseAbility(name, description, custom_id, type){
    return  {
        name: name,
        type: type,
        img: "systems/avd12/images/icons/up-card.svg",
        system: {
            description: description,
            custom: false,
            avd12_id: custom_id,
            utility_roll: false,
            utility_roll_formula: "1d12",
            utility_roll_bonus_modifier: "0",
            attack_roll: false,
            attack_roll_formula: "1d12",
            attack_type: "melee",
            damage_roll: false,
            damage_formula: "",
            damage_type: "physical",
            secondary_damage_roll: false,
            secondary_damage_formula: "",
            secondary_damage_type: "none",
            tertiary_damage_roll: false,
            tertiary_damage_formula: "",
            tertiary_damage_type: "none",
            check_roll: false,
            check_roll_formula: "",
            check_roll_check: "resilience",
            crit_level: "normal",
            daily: false,
            uses: {
                current: 3,
                max: 3
            }
        }
    };
}