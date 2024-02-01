import WAWebJS from "whatsapp-web.js";

function outsideTimeInterval(
    initialTime: string,
    finalTime: string,
    message: WAWebJS.Message,
    cb: (message: WAWebJS.Message) => void,
) {
    const utcMinus3Hours = new Date().getUTCHours() - 3;
    const currentHours = (utcMinus3Hours + 24) % 24; // Considerando 24 horas no dia
    const currentMinutes = new Date().getUTCMinutes();

    const [initialHour, initialMinute] = initialTime.split(":").map(Number);
    const [finalHour, finalMinute] = finalTime.split(":").map(Number);

    const isOutsideTimeInterval = (
        (currentHours < initialHour || (currentHours === initialHour && currentMinutes < initialMinute)) ||
        (currentHours > finalHour || (currentHours === finalHour && currentMinutes > finalMinute))
    );

    if (isOutsideTimeInterval) {
        console.log("ÄQUI")
        cb(message);
    }
}

export default outsideTimeInterval;