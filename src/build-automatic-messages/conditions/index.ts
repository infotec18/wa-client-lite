import WAWebJS from "whatsapp-web.js";
import outsideTimeInterval from "./outsideTimeInterval.condition";

function buildCondition(condition: string, message: WAWebJS.Message, cb: (message: WAWebJS.Message) => void) {
    if (condition === "anyMessage") {
        return () => cb(message);
    } else if (condition.includes("outsideTimeInterval")) {
        const values = condition.replace("outsideTimeInterval", "").replace("(", "").replace(")", "").replace(" ", "");
        const [initialTime, finalTime] = values.split(",");

        return () => outsideTimeInterval(initialTime, finalTime, message, cb);
    }

    return () => null;

}

export default buildCondition;