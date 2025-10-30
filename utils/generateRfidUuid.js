export const generateRfidUuid = (bytes = 4) => {
    return [...Array(bytes)]
        .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}