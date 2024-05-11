

export class Avd12Equipment {

    static getDamageDice(category, upgraded){
        let dice = "1d0"
        switch(category){
            case "unarmed":
                upgraded == 1 ? dice = "1d8" : dice = "1d6"
                break;
            case "light1h":
                upgraded == 1 ? dice = "2d6" : dice = "1d8"
                break;
            case "heavy1h":
                upgraded == 1 ? dice = "2d8" : dice = "1d10"
                break;
            case "light2h":
                upgraded == 1 ? dice = "3d6" : dice = "3d4"
                break;
            case "heavy2h":
                upgraded == 1 ? dice = "3d8" : dice = "2d8"
                break;
            case "ulightranged":
                upgraded == 1 ? dice = "1d10" : dice = "1d6"
                break;
            case "lightranged":
                upgraded == 1 ? dice = "2d6" : dice = "2d4"
                break;
            case "heavyranged":
                upgraded == 1 ? dice = "3d6" : dice = "2d6"
                break;
        }
        return dice
    }
}