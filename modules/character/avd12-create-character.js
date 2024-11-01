export async function createCharacter(){
    //set defaults
    const compendiumPackName = 'avd12.armors';
    const itemName = 'Robe';
    const pack = game.packs.get(compendiumPackName);
    await pack.getIndex();
    const item = pack.index.find(e => e.name === itemName);
    await actor.createEmbeddedDocuments('Item', [item]);

}