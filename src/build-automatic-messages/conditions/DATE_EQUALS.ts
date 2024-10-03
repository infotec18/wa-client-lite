function isDateEquals(dateString: string) {
    // Obtenha a data atual
    const currentDate = new Date();

    // Converta a string de data no formato "YYYY-MM-DD" para um array
    const [year, month, day] = dateString.split('-');

    // Verifica o ano
    const isYearEqual = year === '*' || currentDate.getFullYear() === Number(year);

    // Verifica o mês (ajustando para o formato 0-indexado)
    const isMonthEqual = month === '*' || currentDate.getMonth() + 1 === Number(month);

    // Verifica o dia
    const isDayEqual = day === '*' || currentDate.getDate() === Number(day);

    // Retorna true se todos os campos forem iguais ou aceitos como wildcard (*)
    return isYearEqual && isMonthEqual && isDayEqual;
}

export default isDateEquals;
