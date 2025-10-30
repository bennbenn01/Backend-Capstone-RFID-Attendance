import { PrismaClient } from "@prisma/client"
import timeHelper from '../utils/timeHelper.js'
const prisma = new PrismaClient();

const data_analytics_data = async (req, res) => {
    try {
        const { id, authType, role } = req.user;

        if (!id || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        const condition = role === 'super-admin'
            ? {
                driver_db_id: { not: null },
                OR: [
                    {
                    createdAt: {
                        gte: timeHelper.today(),
                        lt: timeHelper.tomorrow(),
                    },
                    },
                    {
                    time_in: { not: null },
                    time_out: null,
                    },
                ],
                driver: {
                    isDeleted: false,
                },
            }
            :  { 
                driver_db_id: { not: null },
                OR: [
                    {
                        createdAt: {
                            gte: timeHelper.today(),
                            lt: timeHelper.tomorrow()
                        }
                    },
                    {
                        time_in: { not: null },
                        time_out: null
                    }
                ],
                driver: {
                    isDeleted: false,
                    admins: { some: { id: id } }
                }
            }

        const drivers = await prisma.attendance.findMany({
            where: condition,
            orderBy: { createdAt: 'desc' },            
        });

        const driversWithPaid = drivers.map(driver => {
            const butaw = Number(driver.butaw) || 0;
            const boundary = Number(driver.boundary) || 0;
            const balance = Number(driver.balance) || 0;

            return{
                ...driver,
                total_balance: balance || 0,
                total_paid: butaw + boundary
            }
        });

        res.status(200).json({ drivers: driversWithPaid });
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const dataAnalyticsController = {
    data_analytics_data
};

export default dataAnalyticsController;