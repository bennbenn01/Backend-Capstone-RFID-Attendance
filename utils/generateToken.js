export default function generateNumericToken(length = 6) {
    return Math.floor(Math.random() * Math.pow(10, length));
}  