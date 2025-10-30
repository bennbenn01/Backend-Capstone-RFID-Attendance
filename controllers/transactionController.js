import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient();

const transaction_data = async (req, res) => {
    try {
        const { id, authType, role } = req.user;

        if (!id || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin' && role !== 'driver') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }
        
        let driverId = null;

        if (role === 'driver') {
            const driverAcc = await prisma.driverAcc.findUnique({
                where: { id },
                select: { driverId: true },
            });

            if (!driverAcc || !driverAcc.driverId) {
                return res.status(404).json({ message: 'Driver record not found' });
            }

            driverId = driverAcc.driverId;
        } else {
            driverId = req.body.driver_id;

            if (!driverId) {
                return res.status(400).json({ message: 'Missing driver_id in request body' });
            }
        }

        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: {
                driverAcc: true,
                attendance: {
                where: { paid: 'Not Paid' },
                orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        const totalButaw = driver.attendance.reduce((sum, a) => sum + Number(a.butaw || 0), 0);
        const totalBoundary = driver.attendance.reduce((sum, a) => sum + Number(a.boundary || 0), 0);
        const totalBalance = driver.attendance.reduce((sum, a) => sum + Number(a.balance || 0), 0);

        const transaction = {
            driver_id: driver.driver_id,
            fullname: driver.full_name,
            email: driver.driverAcc?.email || 'N/A',
            contact: driver.contact || 'N/A',
            amount: (totalButaw + totalBoundary + totalBalance).toFixed(2),
            status: driver.attendance.length > 0 ? 'Unpaid' : 'No Outstanding Balance',
            createdAt: new Date(),
            details: driver.attendance.map(a => ({
                date: a.createdAt,
                butaw: Number(a.butaw || 0),
                boundary: Number(a.boundary || 0),
                balance: Number(a.balance || 0),
                paid: a.paid,
            })),
        };

        res.status(200).json(transaction);        
    } catch (err) {
        console.error('Error', err);
        res.status(500).json({ message: 'Internal Error' });
    }
}

const tranasactionController = {
    transaction_data
}

export default tranasactionController;