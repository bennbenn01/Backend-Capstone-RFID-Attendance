import { PrismaClient } from "@prisma/client"
import bcrypt from 'bcrypt'
const prisma = new PrismaClient();

async function main() {
    const email = 'example@gmail.com';
    const admin_name = 'Admin';
    const password = process.env.ADMIN_PASS
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingAdmin = await prisma.admin.findFirst({
        where: { role: 'super-admin' }
    });

    if (!existingAdmin) {
        const admin = await prisma.admin.create({
            data: {
                fname: 'Test',
                lname: 'Test',
                admin_name: admin_name,
                email: email,
                password: hashedPassword,
                contact: '0999999999',
                role: 'super-admin',
                verified: true,
                authType: 'local'
            }
        });

        console.log('✅ Admin created successfully:', admin.email);
    } else {
        console.log('✅ Admin created successfully:', existingAdmin.email);
    }
}  

main()
  .catch((err) => {
    console.error('❌ Error seeding admin:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });