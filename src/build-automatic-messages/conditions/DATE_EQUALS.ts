function isDateEquals(dateString: string) {
    // Obtenha a data atual
    const currentDate = new Date();

    // Converta a string de data no formato "YYYY-MM-DD" para um objeto Date
    const [year, month, day] = dateString.split('-').map(Number);
    const inputDate = new Date(year, month - 1, day); // Note que o mês é 0-indexado

    // Compare a data atual com a data fornecida
    return currentDate.getFullYear() === inputDate.getFullYear() &&
        currentDate.getMonth() === inputDate.getMonth() &&
        currentDate.getDate() === inputDate.getDate();
}

export default isDateEquals;