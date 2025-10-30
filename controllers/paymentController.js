import { PrismaClient } from "@prisma/client"
import { DoesExist } from "../utils/customError.js"
const prisma = new PrismaClient();

const payment_data = async (req, res) => {
    try {
        const userId = req.user.id;
        const { authType, role } = req.user;

        if (!userId || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin' && role !== 'driver') {
            return res.sendStatus(401);
        }

        if (authType !== 'local' && authType !== 'google') {
            return res.sendStatus(401);
        }

        const doesExist = await prisma.admin.findUnique({ where: { id: userId } });

        if(!doesExist){
            return res.sendStatus(401);
        }

        const rawPage = parseInt(req.body.page);
        const safePage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
        const take = 10;

        let condition = {}

        if (role === 'super-admin' || role === 'admin') {
            condition = role === 'super-admin'                 
                ? { isDeleted: false }
                : { 
                    isDeleted: false,
                    admins: { some: { id: userId } } 
                }
        } else if (role === 'driver') {
            const driver = await prisma.driverAcc.findUnique({
                where: { id: userId },
                select: { driverId: true }
            });

            if (!driver || !driver.driverId) {
                return res.status(404).json({ message: 'Driver record not found' });
            }            

            condition = {
                id: driver.driverId,
                isDeleted: false
            }
        } else {
            return res.sendStatus(401);
        }

        const totalCount = await prisma.driver.count({
            where: condition,
        });
        const totalPages = Math.max(Math.ceil(totalCount / take), 1);

        const validPage = Math.max(1, Math.min(safePage, totalPages));
        const skip = (validPage - 1) * take;

        const payment = await prisma.driver.findMany({
            skip,
            take,
            where: condition,
            orderBy: { createdAt: 'desc' },
            include: {
                driverAcc,
                attendance
            }
        });

        res.status(200).json({
            payment,
            totalPages,
            currentPage: validPage
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const updatePaymentButaw = async (req, res) => {
    const io = req.app.get('io');

    try {
        const userId = req.user.id;
        const { authType, role } = req.user;

        if (!userId || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin' && role !== 'driver') {
            return res.sendStatus(401);
        }

        if (authType !== 'local' && authType !== 'google') {
            return res.sendStatus(401);
        }

        let doesExist;
        if (role === 'driver') {
            doesExist = await prisma.driverAcc.findUnique({ where: { id: userId } });
        } else {
            doesExist = await prisma.admin.findUnique({ where: { id: userId } });
        }

        if(!doesExist){
            return res.sendStatus(401);
        }

        const { 
            id,  
            driver_id
        } = req.body;

        if(!id || !driver_id){
            return res.status(400).json({ message: 'Invalid request' });
        }

        const attendanceExists = await prisma.attendance.findFirst({
            where: { 
                id,
                driver_id,
                driver: { 
                    isDeleted: false,
                    admins: { some: { id: userId } }
                },
                admins: { some: { id: userId } }
            }
        });

        if (!attendanceExists) {
            return res.status(400).json({ message: 'Attendance record not found or deleted' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const doesExist = await tx.admin.findUnique({
                where: { id: userId }
            });

            if(!doesExist){
                throw new DoesExist();
            }

            const existPayment = await tx.attendance.findFirst({
                where: {
                    id,
                    driver_id,
                    admins: { some: { id: userId } }
                }
            });

            if(!existPayment){
                throw new DoesExist();
            }

            const boundaryVal = existPayment.boundary ? Number(existPayment.boundary.toString()) : 0;
            const butawVal = existPayment.butaw ? Number(existPayment.butaw.toString()) : 0;
            const balanceVal = existPayment.balance ? Number(existPayment.balance.toString()) : 0;

            if(
                boundaryVal === 0 && 
                existPayment.paid === 'Not Paid' &&
                butawVal === 0
            ){
                return await tx.attendance.update({
                    where: { id: id },
                    data: { 
                        butaw: 20,
                        balance: balanceVal - 20
                    },
                });
            }
            
            if(
                boundaryVal === 300 &&
                existPayment.paid === 'Not Paid'
            ){
                return await tx.attendance.update({
                    where: { id: id },
                    data: { 
                        balance: 0,
                        butaw: 20,
                        paid: 'Paid'                      
                    },
                });
            }

            return null;
        });

        io.emit('updated_payment_butaw', { status: 200 });   
        
        res.status(200).json(updated);
    } catch (err) {
        if(err instanceof DoesExist){
            return res.status(err.status).json({ message: err.message });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const updatePaymentBoundary = async (req, res) => {
    const io = req.app.get('io');
    
    try {
        const userId = req.user.id;
        const { authType, role } = req.user;

        if (!userId || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin' && role !== 'driver') {
            return res.sendStatus(401);
        }

        if (authType !== 'local' && authType !== 'google') {
            return res.sendStatus(401);
        }

        let doesExist;
        if (role === 'driver') {
            doesExist = await prisma.driverAcc.findUnique({ where: { id: userId } });
        } else {
            doesExist = await prisma.admin.findUnique({ where: { id: userId } });
        }

        if(!doesExist){
            return res.sendStatus(401);
        }

        const { 
            id,  
            driver_id,
        } = req.body;

        if(!id || !driver_id){
            return res.status(400).json({ message: 'Invalid request' });
        }

        const attendanceExists = await prisma.attendance.findFirst({
            where: { 
                id,
                driver_id,
                driver: { 
                    isDeleted: false,
                    admins: { some: { id: userId } }
                },
                admins: { some: { id: userId } }
            }
        });

        if (!attendanceExists) {
            return res.status(400).json({ message: 'Attendance record not found or deleted' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const existPayment = await tx.attendance.findFirst({
                where: {
                    id,
                    driver_id,
                    admins: { some: { id: userId } }
                }
            });

            if(!existPayment){
                throw new DoesExist();
            }

            const boundaryVal = existPayment.boundary ? Number(existPayment.boundary.toString()) : 0;
            const butawVal = existPayment.butaw ? Number(existPayment.butaw.toString()) : 0;
            const balanceVal = existPayment.balance ? Number(existPayment.balance.toString()) : 0;

            if(
                butawVal === 0 &&
                existPayment.paid === 'Not Paid' &&
                boundaryVal === 0
            ){
                return await tx.attendance.update({
                    where: { id: id },
                    data: {
                        boundary: 300,
                        balance: balanceVal - 300
                    }
                });
            }

            if(
                butawVal === 20 &&
                existPayment.paid === 'Not Paid'
            ){
                return await tx.attendance.update({
                    where: { id: id },
                    data: {
                        balance: 0,
                        boundary: 300,
                        paid: 'Paid'
                    }
                });
            }

            return null;
        });

        io.emit('updated_payment_boundary', { status: 200 });   
        
        res.status(200).json(updated);
    } catch (err) {
        if(err instanceof DoesExist){
            return res.status(err.status).json({ message: err.message });
        }
    
        res.status(500).json({ message: 'Internal Error' });
    }
}

const updateBothPayments = async (req, res) => {
    const io = req.app.get('io');
    
    try {
        const userId = req.user.id;
        const { authType, role } = req.user;

        if (!userId || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin') {
            return res.sendStatus(401);
        }

        if (authType !== 'local' && authType !== 'google' && role !== 'driver') {
            return res.sendStatus(401);
        }

        let doesExist;
        if (role === 'driver') {
            doesExist = await prisma.driverAcc.findUnique({ where: { id: userId } });
        } else {
            doesExist = await prisma.admin.findUnique({ where: { id: userId } });
        }

        if(!doesExist){
            return res.sendStatus(401);
        }

        const { 
            id,  
            driver_id,
        } = req.body;

        if(!id || !driver_id){
            return res.status(400).json({ message: 'Invalid request' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const existPayment = await tx.attendance.findFirst({
                where: { 
                    id: id,
                    driver_id: driver_id,
                    driver: { 
                        isDeleted: false,
                        admins: { some: { id: userId } } 
                    },
                    admins: { some: { id: userId } }
                }
            });

            if(!existPayment){
                throw new DoesExist();
            }

            const butawVal = existPayment.butaw ? Number(existPayment.butaw.toString()) : 0;
            const boundaryVal = existPayment.boundary ? Number(existPayment.boundary.toString()) : 0;
            const balanceVal = existPayment.balance ? Number(existPayment.balance.toString()) : 0;

            if(
                butawVal === 0 &&
                boundaryVal === 0 &&
                existPayment.paid === 'Not Paid' 
            ){
                return await tx.attendance.update({
                    where: { id: id },
                    data: {
                        butaw: 20,
                        boundary: 300,
                        balance: balanceVal - 320,
                        paid: 'Paid'
                    }
                });
            }

            return null;
        });

        io.emit('updated_both_payments', { status: 200 });   
        
        res.status(200).json(updated);
    } catch (err) {
        if(err instanceof DoesExist){
            return res.status(err.status).json({ message: err.message });
        }

        res.status(500).json({ message: 'Internal Error' });
    }
}

const paymentController = {
    payment_data,
    updatePaymentButaw,
    updatePaymentBoundary,
    updateBothPayments
} 

export default paymentController;