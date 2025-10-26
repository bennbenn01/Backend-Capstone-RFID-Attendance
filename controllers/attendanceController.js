import { PrismaClient } from "@prisma/client"
import timeHelper from '../utils/timeHelper.js'
const prisma = new PrismaClient();

const attendance_data = async (req, res) => {
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

        const rawPage = parseInt(req.body.page);
        const safePage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
        const take = 10;

        const totalCount = await prisma.driver.count({
            where: {
                isDeleted: false,
                driver_id: { not: null },
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                }
            }
        });
        const totalPages = Math.max(Math.ceil(totalCount / take), 1);

        const validPage = Math.max(1, Math.min(safePage, totalPages));
        const skip = (validPage - 1) * take;

        const drivers = await prisma.attendance.findMany({
            skip,
            take,
            where: {
                driver: { isDeleted: false },
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
                ]
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({
            drivers,
            totalPages,
            currentPage: validPage
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const getDevice = async (req, res) => {
  try {
    const device = await prisma.driver.findFirst({
        where: { 
            card_id: null,
            dev_status_mode: 'Register' 
        }, 
        orderBy: { createdAt: 'asc' },
        select: { dev_id: true },
    });
    console.log('Get Device: ', device);
    if (!device) {
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

        const dri = await prisma.driver.findUnique({ where: { dev_id: device_id } });
        if (!dri) return res.status(404).send("NoCardFound");

        const cardExists = await prisma.driver.findUnique({ where: { card_id } });
        if (cardExists && cardExists.dev_id !== device_id) {
            return res.status(400).send("CardAlreadyExist");
        }

        await prisma.driver.update({
            where: { dev_id: device_id },
            data: { 
                card_id, 
                dev_status_mode: 'Attendance',
                dev_mode: true
            },
        });

        io.emit('card_updated', {
            action: 'card_dev_mode_updated'
        });

        res.status(200).send("Registered");
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Error");
    }
};

const checkAttendanceStatus = async (req, res) => {
    try {
        const { card_id } = req.query;

        if (!card_id) {
            return res.send('NoCardID');
        }

        const driver = await prisma.driver.findUnique({ where: { card_id: card_id } });

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
                driver_id: driver.driver_id,
                time_in: { not: null },
                time_out: null
            }, 
            orderBy: {
                createdAt: 'desc'
            }
        });

        const todayAttendance = await prisma.attendance.findFirst({
            where: {
                driver_id: driver.driver_id,
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

        const dri = await prisma.driver.findUnique({
            where: { card_id }
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
                driver_id: dri.driver_id,
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
                            driver_id: dri.driver_id
                        }
                    },
                    full_name: dri.full_name,
                    driver_status: 'IN',
                    butaw: 0,
                    boundary: 0,
                    balance: 320,
                    paid: 'Not Paid',
                    time_in: timeHelper.now(),
                    time_out: null,
                    createdAt: timeHelper.now()
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
        res.status(500).send('Error');
    }
}

const getPendingLogoutConfirmation = async (req, res, latest = null) => {
    try {
        let attendanceRecords;

        if (!latest) {
            const { driver_id } = req.body;

            if (!driver_id) {
                return res.status(400).json({ message: 'Driver ID is required' });
            }

            attendanceRecords = await prisma.attendance.findFirst({
                where: {
                    driver_id: latest.driver_id,
                    time_out: null,
                    paid: 'Paid'
                },
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    driver: true
                }
            });
        } else {
            attendanceRecords = await prisma.attendance.findFirst({
                where: {
                    driver_id: latest.driver_id,
                    time_out: null,
                    paid: 'Paid'
                },
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    driver: true
                }
            });
        }

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

        const driver = await prisma.driver.findUnique({ where: { card_id } });

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
                time_out: null
            }
        });

        const latest = await prisma.attendance.findFirst({
            where: {
                driver_id: driver.driver_id,
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                }
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
                    driver_id,
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

const attendanceController = {
    attendance_data,
    getDevice,
    driCardRegister,
    checkAttendanceStatus,
    timeInAttendance,
    reqLogoutConfirmation,
    checkPaidLogout,
    getPendingLogoutConfirmation
}

export default attendanceController;