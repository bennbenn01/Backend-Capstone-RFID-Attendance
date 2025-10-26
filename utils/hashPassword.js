import bcrypt from 'bcrypt'

const hashPassword = async(password) => {
    const saltRounts = 10;
    return await bcrypt.hash(password, saltRounts);
}

export default hashPassword;