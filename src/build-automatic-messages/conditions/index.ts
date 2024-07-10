import outsideTimeInterval from "./outsideTimeInterval.condition";

function checkCondition(condition: string): boolean {
    if (condition === "anyMessage") {
        return true; 1
    } else if (condition.includes("outsideTimeInterval")) {
        const values = condition.replace("outsideTimeInterval", "").replace("(", "").replace(")", "").replace(" ", "");
        const [initialTime, finalTime] = values.split(",");

        return outsideTimeInterval(initialTime, finalTime);
    }

    return false

}

export default checkCondition;