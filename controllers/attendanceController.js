import { PrismaClient } from "@prisma/client"
import timeHelper from '../utils/timeHelper.js'
import cron from 'node-cron'
const prisma = new PrismaClient();

const attendance_data = async (req, res) => {
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

        const rawPage = parseInt(req.body.page);
        const safePage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
        const take = 10;

        let condition = {}

        if (role === 'super-admin' || role === 'admin') {
            condition = {
                driver_db_id: { not: null },
                driver: {
                    isDeleted: false,
                    ...(role !== 'super-admin' && { admins: { some: { id: id } }})
                },
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
            }
        } else if (role === 'driver') {
            const driver = await prisma.driverAcc.findUnique({
                where: { id },
                select: { driverId: true }
            });

            if (!driver || !driver.driverId) {
                return res.status(404).json({ message: 'Driver record not found' });
            }            

            condition = {
                driver_db_id: driver.driverId,
                driver: { isDeleted: false }
            }
        } else {
            return res.sendStatus(401);
        }
 
        const totalCount = await prisma.attendance.count({
            where: condition
        });
        const totalPages = Math.max(Math.ceil(totalCount / take), 1);

        const validPage = Math.max(1, Math.min(safePage, totalPages));
        const skip = (validPage - 1) * take;

        const drivers = await prisma.attendance.findMany({
            skip,
            take,
            where: condition,
            orderBy: { createdAt: 'desc' },
            include: { 
                driver: {
                    select: {
                        driver_id: true,
                        full_name: true,
                        createdAt: true,
                    }
                } 
            }
        });

        res.status(200).json({
            drivers,
            totalPages,
            currentPage: validPage
        });
    } catch (err) {
        console.error('Error', err);
        res.status(500).json({ message: 'Internal Error' });
    }
}

const getDevice = async (req, res) => {
  try {
    const queued = await prisma.deviceQueue.findFirst({
        where: { processed: false },
        orderBy: { createdAt: 'asc' }
    });

    if (!queued) {
        return res.status(200).send("NoDevice");
    }

    const device = await prisma.driver.findFirst({
        where: {
            id: queued.device_id, 
            card_id: null,
            dev_status_mode: 'Register',
            isDeleted: false
        }, 
        orderBy: { createdAt: 'asc' },
        select: { dev_id: true },
    });
    
    if (!device) {
        await prisma.deviceQueue.update({
            where: { id: queued.id },
            data: { processed: true }
        });
        return res.status(200).send("NoDevice");
    }

    res.status(200).send(device.dev_id);
  } catch (err) {
    res.status(500).send("Internal Error");
  }
}

const driCardRegister = async (req, res) => {
    const io = req.app.get('io');

    try {
        const { card_id, device_id } = req.body;

        if (!card_id || !device_id) {
        return res.status(400).send("NotFound");
        }

        const dri = await prisma.driver.findFirst({ 
            where: { 
                dev_id: device_id,
                isDeleted: false 
            },
            include: {
                admins: true,
                driverAcc: true
            }
        });
        if (!dri) return res.status(404).send("NoCardFound");

        const cardExists = await prisma.driver.findFirst({ 
            where: { 
                card_id,
                isDeleted: false 
            } 
        });
        if (cardExists && cardExists.dev_id !== device_id) {
            return res.status(400).send("CardAlreadyExist");
        }

        await prisma.driver.update({
            where: { id: dri.id },
            data: { 
                card_id, 
                dev_status_mode: 'Attendance',
                dev_mode: true
            },
        });

        if (!dri.driverAcc) {
            await prisma.driverAcc.create({
                data: {
                    fname: dri.fname,
                    lname: dri.lname,
                    driver_name: dri.full_name,
                    authType: 'local',
                    role: 'driver',
                    verified: true,
                    isActive: false,
                    driver: {
                        connect: { id: dri.id }
                    }
                }
            });
        }

        await prisma.deviceQueue.updateMany({
            where: { device_id: dri.id },
            data: { processed: true }
        });

        io.emit('card_updated', {
            action: 'card_dev_mode_updated'
        });

        res.status(200).send("Registered");
    } catch (err) {
        res.status(500).send("Internal Error");
    }
};

const checkAttendanceStatus = async (req, res) => {
    try {
        const { card_id } = req.query;

        if (!card_id) {
            return res.send('NoCardID');
        }

        const driver = await prisma.driver.findFirst({ where: { card_id: card_id } });

        if (!driver) {
            console.log('Device mode is not found',  driver);
            return res.send('NotFound');
        }

        if (driver.dev_mode === false) {
            console.log('Device mode is false',  driver);
            return res.send('NotReg');
        }

        const unfinished = await prisma.attendance.findFirst({
            where: {
                driver_db_id: driver.id,
                time_in: { not: null },
                time_out: null
            }, 
            orderBy: {
                createdAt: 'desc'
            }
        });

        const todayAttendance = await prisma.attendance.findFirst({
            where: {
                driver_db_id: driver.id,
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                }
            },
        });

        let status;

        if (unfinished && !todayAttendance) {
            status = 'Unfinish';
        } else if (!todayAttendance) {
            status = 'NoIn';
        } else if (todayAttendance.time_in && !todayAttendance.time_out) {
            status = todayAttendance.paid === 'Paid'
                ? 'InPaid'
                : 'InNoPaid';
        } else if (todayAttendance.time_in && todayAttendance.time_out) {
            status = 'Done';
        } else {
            status = 'Unkn';
        }

        return res.send(`${status}|id:${driver.dev_id}`);
    } catch (err) {
        console.error('Check Attendance: ', err);
        res.status(500).send('Internal Error');
    }
}

const googleFormSubmit = async (req, res) => {
    try {
        const { full_name, driver_status, paymentOption } = req.body;
        
    } catch (error) {
        res.status(500).send('Internal Error');
    }   
}

const timeInAttendance = async (req, res) => {
    const io = req.app.get('io');

    try {
        const method = req.method;
        let card_id, device_id;

        if (method === 'POST') {
            ({ card_id, device_id } = req.body || {});
        } else {
            ({ card_id, device_id } = req.query || {});
        }

        if (!card_id || !device_id) {
            return res.status(400).send('NoIDs');
        }

        const dri = await prisma.driver.findFirst({
            where: { card_id },
            include: { admins: true }
        });

        if (!dri) {
            return res.send('NotFound');
        }

        if (dri.dev_mode == false) {
            return res.send('NotReg');
        }

        if (dri.dev_id !== device_id) {
            return res.send('NotAllow');
        }

        const latest = await prisma.attendance.findFirst({
            where: {
                driver_db_id: dri.id,
                time_in: { not: null },
                time_out: null,
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                }
            },
        });

        if (latest) {
            return res.status(403).send('AlreadyIn');
        }

        if (!latest) {
            await prisma.attendance.create({
                data: {
                    driver: {
                        connect: {
                            id: dri.id
                        }
                    },
                    driver_id: dri.driver_id,
                    full_name: dri.full_name,
                    driver_status: 'IN',
                    butaw: 0,
                    boundary: 0,
                    balance: 320,
                    paid: 'Not Paid',
                    time_in: timeHelper.now(),
                    time_out: null,
                    createdAt: timeHelper.now(),
                    admins: {
                        connect: (dri.admins || []).map((admin) => ({ id: admin.id }))
                    }
                }
            });

            io.emit('attendance:timein', {
                driver_id: dri.driver_id,
                action: 'time_in',
                status: 200
            });

            return res.send(`In|${dri.full_name}`);
        }
    } catch (err) {
        console.error('Time In: ', err);
        res.status(500).send('Error');
    }
}

const getPendingLogoutConfirmation = async (req, res, latest = null) => {
    try {
        const adminId = req.user?.id || null;

        let driverId;

        if (!latest) {
            ({ driver_id: driverId } = req.body || {});
            if (!driverId) {
                return res.status(400).json({ message: 'Driver ID is required' });
            }
        } else {
            driverId = latest.driver_id;
        }

        const whereClause = {
            driver_id: driverId,
            time_out: null,
            paid: 'Paid',
            driver: {
                isDeleted: false
            }
        };

        if (adminId) {
            whereClause.driver.admins = { some: { id: adminId } };
            whereClause.admins = { some: { id: adminId } };
        }

        const attendanceRecords = await prisma.attendance.findFirst({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { driver: true }
        });

        if (!attendanceRecords) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        if (attendanceRecords.driver?.driver_img) {
            const base64Image = Buffer.from(attendanceRecords.driver.driver_img).toString('base64');
            const imgType = attendanceRecords.driver.img_type;
            attendanceRecords.driver.driver_img = `data:${imgType};base64,${base64Image}`;
        }

        if (req.route && req.route.path.includes('get-pending-logout')) {
            res.status(200).json({
                logoutConfirmation: true,
                driver: attendanceRecords
            });
        }

        return attendanceRecords;
    } catch (err) {
        if (req.route && req.route.path.includes('get-pending-logout')) {
            return res.status(500).json({ message: 'Internal Error' });
        }

        throw err;
    }
}

const reqLogoutConfirmation = async (req, res) => {
    const io = req.app.get('io');

    try {
        const method = req.method;
        let card_id, device_id;

        if (method === 'POST') {
            ({ card_id, device_id } = req.body || {});
        } else {
            ({ card_id, device_id } = req.query || {});
        }
    
        if (!card_id || !device_id) {
            return res.status(400).send('NoIDs');
        }

        const driver = await prisma.driver.findFirst({ 
            where: { 
                card_id,
                isDeleted: false 
            },
            include: {
                admins: true
            } 
        });

        if (!driver) {
            return res.send('NotFound');
        }

        if (driver.dev_id !== device_id) {
            return res.send('NotAllow');
        }

        if (driver.dev_mode === false) {
            return res.send('NotReg');
        }

        const unfinished = await prisma.attendance.findFirst({
            where: {
                driver_id: driver.driver_id,
                time_in: { not: null },
                time_out: null,
                driver: {
                    isDeleted: false,
                    admins: { some: { id: { in: driver.admins.map(admin => admin.id) } } }
                },
                admins: { some: { id: { in: driver.admins.map(admin => admin.id) } } }
            }
        });

        const latest = await prisma.attendance.findFirst({
            where: {
                driver_id: driver.driver_id,
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                },
                driver: {
                    isDeleted: false,
                    admins: { some: { id: { in: driver.admins.map(admin => admin.id) } } }
                },
                admins: { some: { id: { in: driver.admins.map(admin => admin.id) } } }
            },
        });

        let activeAttendance = null;

        if (latest && latest.time_out === null) {
            activeAttendance = latest;
        } else if (unfinished && !latest) {
            activeAttendance = unfinished;
        }

        if (!activeAttendance) {
            return res.status(400).send('NoRec');
        }

        if (activeAttendance.paid !== 'Paid') {
            return res.status(400).send('NoPay');
        }

        const pendingKey = `${driver.driver_id}_${activeAttendance.id}`

        if (!req.app.locals.pendingDeviceResponses) {
            req.app.locals.pendingDeviceResponses = new Map();
        }

        req.app.locals.pendingDeviceResponses.set(pendingKey, {
            res,
            driver,
            attendanceId: activeAttendance.id,
            timestamp: Date.now()
        });

        setTimeout(() => {
            const pending = req.app.locals.pendingDeviceResponses.get(pendingKey);
            if (pending && pending.res === res) {
                req.app.locals.pendingDeviceResponses.delete(pendingKey);
                if (!res.headersSent) {
                    res.status(408).send('Timeout');
                }
            }
        }, 30000);

        io.emit('attendance:logout-confirmation', {
            driver_id: driver.driver_id,
            action: 'logout_request',
            status: 200
        });

        return getPendingLogoutConfirmation(req, res, activeAttendance);
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const checkPaidLogout = async (req, res) => {
    const io = req.app.get('io');

    try {
        const { id, driver_id } = req.body;

        if (!id || !driver_id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const latest = await tx.attendance.findFirst({
                where: {
                    id: id,
                    driver_id: driver_id,
                    time_out: null,
                    paid: 'Paid',
                    driver: {
                        isDeleted: false
                    },
                    admins: { some: { id: req.user?.id || null } }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (!latest || latest.paid !== 'Paid') {
                throw new Error('DriNotYetPaid');
            }

            return await tx.attendance.update({
                where: { id: latest.id },
                data: {
                    driver_status: 'OUT',
                    time_out: timeHelper.now(),
                }
            });
        })

        io.emit('attendance:logout-completed', {
            driver_id: result.driver_id,
            action: 'time_out',
            full_name: result.full_name
        });

        const pendingKey = `${driver_id}_${id}`;
        const pendingDevice = req.app.locals.pendingDeviceResponses?.get(pendingKey);

        if (pendingDevice && !pendingDevice.res.headersSent) {
            pendingDevice.res.send(`Out|${result.full_name}`);    
            req.app.locals.pendingDeviceResponses?.get(pendingKey);
        }

        return res.sendStatus(200);
    } catch (err) {
        if (err.message === 'DriNotYetPaid') {
            return res.status(400).json({ message: 'Driver has not yet paid' });
        }

        res.status(500).json({ message: 'Internal Error' });
    }
}

const checkDriverName = async (req, res) => {
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

        const driverAccRecord = await prisma.driverAcc.findUnique({
            where: { id }, 
            select: {
                driverId: true,
                driver: {
                    select: {
                        id: true,
                        driver_id: true,
                        full_name: true,
                    }
                }
            }
        });

        if (!driverAccRecord || !driverAccRecord.driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        const driverData = driverAccRecord.driver;

        res.status(200).json(driverData);        
    } catch (err) {
        console.error('Error', err);
        res.status(500).json({ mnessage: 'Internal Error' });
    }
}

const manualTimeIn = async (req, res) => {
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

        const { driver_db_id, time_in, reason } = req.body;

        if (!driver_db_id || !time_in) {
            return res.status(400).json({ message: 'Driver ID and Time In are required.' });
        }

        const existing = await prisma.attendance.findFirst({
            where: {
                driver_db_id: Number(driver_db_id),
                time_out: null,
            }
        });

        if (existing) {
            return res.status(400).json({ message: 'You already have an active attendance record without time out.' });
        }

        const driver = await prisma.driver.findUnique({
            where: { id: driver_db_id }
        });

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        const unfinished = await prisma.attendance.findFirst({
            where: {
                driver_db_id: Number(driver_db_id),
                time_in: { not: null },
                time_out: null,
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                }
            }
        });

        if (unfinished) {
            return res.status(400).json({ message: 'Driver already time-in and has no time-out today.' });
        }

        const completed = await prisma.attendance.findFirst({
            where: {
                driver_db_id: driver_db_id,
                time_in: { not: null },
                time_out: { not: null },
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                }
            }
        });

        if (completed) {
            return res.status(400).json({ message: 'Driver has already completed attendance today.' });
        }

        await prisma.attendance.create({
            data: {
                driver_db_id: driver_db_id,
                driver_id: driver.driver_id,
                full_name: driver.full_name,
                driver_status: 'IN',
                time_in: new Date(time_in),
                time_out: null,
                createdAt: new Date(),
                balance: 320,
                paid: 'Not Paid',
                reason
            }
        });

        res.sendStatus(201);
    } catch (err) {
        res.status(500).json({ mnessage: 'Internal Error' });
    }
}

const manualTimeOut = async (req, res) => {
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

        const { driver_db_id, time_out, reason } = req.body;

        if (!driver_db_id || !time_out) {
            return res.status(400).json({ message: 'Driver ID and Time Out are required.' });
        }

        const driver = await prisma.driver.findUnique({
            where: { id: driver_db_id }
        });

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        const existing = await prisma.attendance.findFirst({
            where: {
                driver_db_id: driver_db_id,
                time_out: null,
            },
            orderBy: { time_in: 'desc' }
        });

        if (!existing) {
            return res.status(400).json({ message: 'No active attendance found to time out.' });
        }

        await prisma.attendance.update({
            where: { id: existing.id },
            data: {
                time_out: new Date(time_out),
                paid: 'Paid',
                driver_status: 'OUT',
                reason
            }
        });

        res.sendStatus(201);
    } catch (err) {
        res.status(500).json({ mnessage: 'Internal Error' });
    }
}

const paymentReminder = async () => {
    console.log('Node-Cron Started');

    try {
        const io = global.io;
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const unpaidAttendances = await prisma.attendance.findMany({
            where: {
                paid: 'Not Paid',
                createdAt: { lte: threeDaysAgo }
            },
            include: { driver: true }
        });

        unpaidAttendances.forEach(att => {
            io.emit('payment-reminder', {
                driver_id: att.driver_id,
                full_name: att.driver.full_name,
                message: 'Reminder: Payment for butaw and boundary for 3 days is still missing.'
            });
        });
    } catch (err) {
        console.log('Node-Cron Error');
    }
}

const inActiveDriverReminder = async () => {
    console.log('Node-Cron Started');

    try {
        const io = global.io;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const inactiveDrivers = await prisma.driver.findMany({
            where: {
                updatedAt: { lte: sixMonthsAgo },
                isDeleted: false
            }
        });

        inactiveDrivers.forEach(driver => {
            io.emit('inactive-driver', {
                driver_id: driver.id,
                full_name: driver.full_name,
                message: 'Driver inactive for 6 months. Renewal fee required to continue membership.'
            });
        });
    } catch (err) {
        console.log('Node-Cron Error');
    }
}

cron.schedule('0 12 * * *', paymentReminder);
cron.schedule('0 12 * * *', inActiveDriverReminder);

await paymentReminder();
await inActiveDriverReminder();

const attendanceController = {
    attendance_data,
    getDevice,
    driCardRegister,
    checkAttendanceStatus,
    googleFormSubmit,
    timeInAttendance,
    reqLogoutConfirmation,
    checkPaidLogout,
    getPendingLogoutConfirmation,

    checkDriverName,
    manualTimeIn,
    manualTimeOut,
}

export default attendanceController;