import { compilePack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from 'path';

const MODULE_ID = process.cwd();
const yaml = false;
const srcPath = path.join(MODULE_ID, 'src', 'packs');

function getNameByID(uuid) {
    switch(uuid) {
        case "ce13e78a37744bdf": return "Core";
        case "82c17fbad4244aaf": return "Secondary";
        case "0d3f46dc2f734ec5": return "Origin";
        case "1042b1f04fcd4af1": return "Cultural";
        case "8f0646a847504190": return "Actions";
        case "d6656fd454944b77": return "Reactions";
        case "61f74e9ee4ba4778": return "FreeActions";
        case "499a150c43d84ce4": return "Armor";
        case "6fb4040aad8e400b": return "Shields";
        case "334f21e5d5484575": return "Weapons";
        case "b57085cbc4b04add": return "Gloves";
        case "ece480aae3cd4d32": return "Boots";
        case "12dc74b2243c4c88": return "Cloaks";
        case "2f4d9e1c69c949f3": return "Headwear";
        case "3e6a2b27ce4c4ef6": return "Accessories";
        case "bf6ebd898f8c4b1b": return "Enhancements";
        case "4b09bbc3c03e42b3": return "Ballads";
        case "808eb9279dd14cac": return "Goods";
        case "26e841a6d2d74240": return "Auguration";
        case "d78aa842ccee4c00": return "Divine";
        case "17279f3188744fd0": return "Witchcraft";
        case "b4c431a1b6ab4290": return "Necromancy";
        case "170d183cc7374d90": return "Evocation";
        case "3efb5b7675504990": return "Transmutation";
        case "5d80efd4dee44290": return "Illusion";
        case "20f1de405baf41c0": return "Druidic";
        case "4be3893bf6e64d90": return "Abjuration";
        case "11b76fa4305a4bf0": return "Fiend";
        case "f95fde665def4c00": return "Fey";
        case "50cf8683da8b4c80": return "Draconic";
        case "059e0c0e659a4090": return "Cosmic";
        default: return "Unknown";
    }
}

function getSpellLevel(uuid){
    let u = uuid[uuid.length - 1];
    switch(u){
        case "0": return "Main"
        case "1": return "Beginner"
        case "2": return "Novice"
        case "3": return "Journeyman"
        case "4": return "Expert"
        case "5": return "Master"
        case "6": return "GrandMaster"
        default:return "Unknown"
    }
}

function getSpellFolderSort(uuid){
    let u = uuid[uuid.length - 1];
    switch(u){
        case "0": return 0
        case "1": return 0
        case "2": return 1
        case "3": return 2
        case "4": return 3
        case "5": return 4
        case "6": return 5
        default:return "Unknown"
    }
}

function isSpellFolder(uuid){
    let u = uuid.slice(0, -1) + "0";
    switch (u){
        case "26e841a6d2d74240": return true;
        case "d78aa842ccee4c00": return true;
        case "17279f3188744fd0": return true;
        case "b4c431a1b6ab4290": return true;
        case "170d183cc7374d90": return true;
        case "3efb5b7675504990": return true;
        case "5d80efd4dee44290": return true;
        case "20f1de405baf41c0": return true;
        case "4be3893bf6e64d90": return true;
        case "11b76fa4305a4bf0": return true;
        case "f95fde665def4c00": return true;
        case "50cf8683da8b4c80": return true;
        case "059e0c0e659a4090": return true;
    }
    return false;
}

function getSpellFolderUUID(uuid){
    let u = uuid.slice(0, -1) + "0";
    switch (u){
        case "26e841a6d2d74240": return "26e841a6d2d74240";
        case "d78aa842ccee4c00": return "d78aa842ccee4c00";
        case "17279f3188744fd0": return "17279f3188744fd0";
        case "b4c431a1b6ab4290": return "b4c431a1b6ab4290";
        case "170d183cc7374d90": return "170d183cc7374d90";
        case "3efb5b7675504990": return "3efb5b7675504990";
        case "5d80efd4dee44290": return "5d80efd4dee44290";
        case "20f1de405baf41c0": return "20f1de405baf41c0";
        case "4be3893bf6e64d90": return "4be3893bf6e64d90";
        case "11b76fa4305a4bf0": return "11b76fa4305a4bf0";
        case "f95fde665def4c00": return "f95fde665def4c00";
        case "50cf8683da8b4c80": return "50cf8683da8b4c80";
        case "059e0c0e659a4090": return "059e0c0e659a4090";
    }
    return "";
}

function getFolderName(uuid, name){
    return `folders_${name}_${uuid}.json`; 
}

function getFolderStructure(uuid){
    return {
        "name": getNameByID(uuid),
        "sorting": "m",
        "folder": null,
        "type": "Item",
        "_id": uuid,
        "description": "",
        "sort": 0,
        "color": null,
        "flags": {},
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "coreVersion": "12.331",
            "systemId": "avd12",
            "systemVersion": "13.0.2",
            "createdTime": 1730616445293,
            "modifiedTime": 1730616445293,
            "lastModifiedBy": "uYB22jThHi4vSl7b"
        },
        "_key": `!folders!${uuid}`
    };
}

function getEmbeddedFolderStructure(uuid){
    return {
        "name": getSpellLevel(uuid),
        "sorting": "m",
        "folder": `${getSpellFolderUUID(uuid)}`,
        "type": "Item",
        "_id": uuid,
        "description": "",
        "sort": getSpellFolderSort(uuid),
        "color": null,
        "flags": {},
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "coreVersion": "12.331",
            "systemId": "avd12",
            "systemVersion": "13.0.2",
            "createdTime": 1730616445293,
            "modifiedTime": 1730616445293,
            "lastModifiedBy": "uYB22jThHi4vSl7b"
        },
        "_key": `!folders!${uuid}`
    };
}


async function getUniqueFolders() {
    const packFolders = await fs.readdir(srcPath);
    for (const pack of packFolders) {
        if (pack === '.gitattributes') continue;

        const packPath = path.join(srcPath, pack);
        const files = await fs.readdir(packPath);
        const uniqueFolders = new Set();

        const uniqueSpellFolders = new Set();
        const uniqueSchoolFolders = new Set();
        if(pack == "spells"){

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(packPath, file);
                    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    if (data.folder) {
                        if(isSpellFolder(data.folder)){
                            uniqueSchoolFolders.add(getSpellFolderUUID(data.folder));
                        }
                        uniqueSpellFolders.add(data.folder);
                    }
                }
            }

            for(const folderID of uniqueSchoolFolders){
                const folderStructure = getFolderStructure(folderID);
                const folderFileName = getFolderName(folderID, getNameByID(folderID));
                const folderFilePath = path.join(packPath, folderFileName);
                
                await fs.writeFile(folderFilePath, JSON.stringify(folderStructure, null, 2));
                console.log(`Created folder file: ${folderFilePath}`);

            }
            
            for(const folderID of uniqueSpellFolders){
                const folderStructure = getEmbeddedFolderStructure(folderID);
                const folderFileName = getFolderName(folderID, getSpellLevel(folderID));
                const folderFilePath = path.join(packPath, folderFileName);
                
                await fs.writeFile(folderFilePath, JSON.stringify(folderStructure, null, 2));
                console.log(`Created folder file: ${folderFilePath}`);
            }


        }
        else{
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(packPath, file);
                    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    
                    if (data.folder) {
                        uniqueFolders.add(data.folder);
                    }
                }
            }
    
            if (uniqueFolders.size > 0) {
                for (const folderID of uniqueFolders) {
                    const folderStructure = getFolderStructure(folderID);
                    const folderFileName = getFolderName(folderID, getNameByID(folderID));
                    const folderFilePath = path.join(packPath, folderFileName);
                    
                    await fs.writeFile(folderFilePath, JSON.stringify(folderStructure, null, 2));
                    console.log(`Created folder file: ${folderFilePath}`);
                }
            } else {
                console.log(`No unique folders found in ${pack}`);
            }
        }
        
    }
}

async function packAll() {
    await getUniqueFolders();
    const packs = await fs.readdir(srcPath);
    for (const pack of packs) {
        if (pack === '.gitattributes') continue;
        console.log('Packing ' + pack);
        await compilePack(
            `${MODULE_ID}/src/packs/${pack}`,
            `${MODULE_ID}/packs/${pack}`,
            { yaml }
        );
    }
}

packAll()
    .then(() => console.log("Folder extraction and packing complete."))
    .catch(console.error);
