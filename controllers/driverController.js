import { PrismaClient } from "@prisma/client"
import elasticClient from '../config/elasticsearch.js'
import { DoesExist } from '../utils/customError.js'
import timeHelper from "../utils/timeHelper.js"
const prisma = new PrismaClient();

const dashboard_data = async (req, res) => {
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

        const totalCount = await prisma.attendance.count({
            where: {
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
                    },
                ],
                driver: { isDeleted: false }
            }
        });
        const totalPages = Math.max(Math.ceil(totalCount / take), 1);

        const validPage = Math.max(1, Math.min(safePage, totalPages));
        const skip = (validPage - 1) * take;

        const drivers = await prisma.attendance.findMany({
            skip,
            take,
            where: {
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
                driver: { isDeleted: false }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                driver: true
            }
        });

        const recordsWithBase64Images = drivers.map(record => {
            if (record.driver?.driver_img) {
                const base64Image = Buffer.from(record.driver.driver_img).toString('base64');
                const imgType = record.driver.img_type;
                return {
                    ...record,
                    driver: {
                        ...record.driver,
                        driver_img: `data:${imgType};base64,${base64Image}`
                    }
                };
            }
            return record;
        });

        const totalAttendance = await prisma.attendance.count({
            where: {
                driver_id: { not: null },
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                },
                driver: { isDeleted: false },
            }
        });

        const totalDrivers = await prisma.driver.count({
            where: { 
                driver_id: { not: null }, isDeleted: false
            }
        });

        const totalButaw = await prisma.attendance.count({
            where: { 
                butaw: 20,
                driver_id: { not: null },
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                },   
                driver: { isDeleted: false },
            }
        });

        const totalBoundary = await prisma.attendance.count({
            where: { 
                boundary: 300,
                driver_id: { not: null },
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                },
                driver: { isDeleted: false },   
            }
        });

        const totalPaid = await prisma.attendance.count({
            where: { 
                paid: 'Paid',
                driver_id: { not: null },
                createdAt: {
                    gte: timeHelper.today(),
                    lt: timeHelper.tomorrow()
                },
                driver: { isDeleted: false },   
            }
        });

        res.status(200).json({
            drivers: recordsWithBase64Images,
            totalAttendance,
            totalDrivers,
            totalButaw,
            totalBoundary,
            totalPaid,
            totalPages,
            currentPage: validPage
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const manage_users_data = async (req, res) => {
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
            where: { isDeleted: false }
        });
        const totalPages = Math.max(Math.ceil(totalCount / take), 1);

        const validPage = Math.max(1, Math.min(safePage, totalPages));
        const skip = (validPage - 1) * take;

        const drivers = await prisma.driver.findMany({
            skip,
            take,
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
        });

        const driversWithBase64Images = drivers.map(drivers => {
            if (drivers.driver_img) {
                const base64Image = Buffer.from(drivers.driver_img).toString('base64');
                const imgType = drivers.img_type;
                return {
                    ...drivers,
                    driver_img: `data:${imgType};base64,${base64Image}`
                };
            }
            return drivers;
        });

        res.status(200).json({
            drivers: driversWithBase64Images,
            totalPages,
            currentPage: validPage
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const addInfo = async (req, res) => {
    const io = req.app.get('io');

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

        const { 
            dev_id, 
            driver_id,
            firstName, 
            lastName,
            contact,
            plate_no
        } = req.body;
        const file = req.file;

        if (!dev_id || !driver_id) {
            return res.status(400).json('Invalid Request');
        }

        await prisma.$transaction(async (tx) => {
            const doesExist = await tx.admin.findUnique({
                where: { id }
            });

            if (!doesExist) {
                throw new DoesExist();
            }

            const existingDriver = await tx.driver.findFirst({
                where: {
                    OR: [
                        { dev_id },
                        { driver_id },
                        { contact }
                    ],
                    isDeleted: false,
                },
            });

            if (existingDriver) {
                throw new Error('DriAlreadyExist');
            }

            /** @type {any} */
            const receiveData = {
                driver_id,
                dev_id,
                dev_status_mode: 'Register',
                dev_mode: false,
                fname: firstName,
                lname: lastName,
                contact,
                plate_no,
                full_name: `${firstName.trim()} ${lastName.trim()}`,
            }

            if (file) {
                receiveData.driver_img = file.buffer;
                receiveData.img_type = file.mimetype;
            } else if ((existingDriver && existingDriver.contact) === receiveData.contact) {
                throw new Error('ExistContact');
            }

            const createDriver = await tx.driver.create({
                data: receiveData
            });

            await elasticClient.index({
                index: 'drivers',
                id: createDriver.id.toString(),
                document: {
                    driver_id: createDriver.driver_id,
                    full_name: createDriver.full_name,
                }
            })
        });

        io.emit('updated', { status: 200 });

        res.sendStatus(201);
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(err.status).json({ message: err.message });
        }

        if (err.message === 'ExistContact') {
            return res.status(400).json({ message: 'Contact number already exist' });
        }

        if (err.message === 'DriAlreadyExist') {
            return res.status(409).json({ message: 'Driver already exist! Please try again' });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const updateDevice = async (req, res) => {
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

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        const { id, dev_id, upd_dev_id, full_name, dev_status_mode } = req.body;

        if (!id || !dev_id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        await prisma.$transaction(async (tx) => {
            const doesExist = await tx.admin.findUnique({
                where: { id: userId }
            });

            if (!doesExist) {
                throw new DoesExist();
            }

            const existingDriver = await tx.driver.findFirst({
                where: {
                    id,
                    dev_id,
                    isDeleted: false,
                },
            });

            if (!existingDriver) {
                throw new Error('DevDoesNotExist');
            }

            const updateData = {};

            if (upd_dev_id !== undefined) {
                updateData.dev_id = upd_dev_id;
            }

            if (full_name !== undefined) {
                updateData.full_name = full_name;
            }

            if (dev_status_mode !== undefined) {
                updateData.dev_status_mode = dev_status_mode !== 'Register' ? 'Attendance' : 'Register';
                updateData.dev_mode = dev_status_mode !== 'Register' ? true : false;
                updateData.card_id = dev_status_mode !== 'Register' ? existingDriver.card_id : null
            }

            await tx.driver.update({
                where: {
                    id: id,
                    dev_id: dev_id
                },
                data: updateData
            });

            const updateDriver = await prisma.driver.findUnique({
                where: { id }
            });

            await elasticClient.index({
                index: 'drivers',
                id: updateDriver.id.toString(),
                document: {
                    driver_id: updateDriver.driver_id,
                    full_name: updateDriver.full_name,
                }
            });
        });

        io.emit('updated', { status: 200 });

        res.sendStatus(200);
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(err.status).json({ message: err.message });
        }
        if (err.message === 'Dev does not exist') {
            return res.status(400).json({ message: 'Invalid request' });
        }

        res.status(500).json({ message: 'Internal Error' });
    }
}

const deleteDevice = async (req, res) => {
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

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        const { id, dev_id } = req.body;

        if (!id || !dev_id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        await prisma.$transaction(async (tx) => {
            const doesExist = await tx.admin.findUnique({
                where: { id: userId }
            });

            if (!doesExist) {
                throw new DoesExist();
            }

            const driver = await tx.driver.findFirst({
                where: {
                    id: id,
                    dev_id: dev_id,
                    isDeleted: false
                }
            });

            if (!driver) {
                throw new Error('DevDoesNotExist');
            }

            await tx.driver.update({
                where: { id },
                data: { isDeleted: true },
            });

            await elasticClient.delete({
                index: 'drivers',
                id,
            });
        });

        io.emit('updated', { status: 200 });

        res.sendStatus(200);
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(err.status).json({ message: err.message });
        }

        if (err.message === 'DevDoesNotExist') {
            return res.status(400).json({ message: 'Driver not found or already deleted"' });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const updateDriver = async (req, res) => {
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

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        const doesExist = await prisma.admin.findUnique({ where: { id: userId } });

        if (!doesExist) {
            return res.sendStatus(401);
        }

        const {
            id,
            dev_id,
            driver_id,
            firstName,
            lastName,
            contact,
            plate_no
        } = req.body;
        const file = req.file;

        if (!id || !dev_id || !driver_id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        await prisma.$transaction(async (tx) => {
            const doesExist = await tx.admin.findUnique({
                where: { id: userId }
            });

            if (!doesExist) {
                throw new DoesExist();
            }

            const existingDriver = await tx.driver.findFirst({
                where: { id: parseInt(id), dev_id, isDeleted: false },
            });

            if (!existingDriver) throw new Error('DriverNotFound');

            /** @type {any} */
            const updateData = {
                driver_id,
                fname: firstName,
                lname: lastName,
                full_name: `${firstName.trim()} ${lastName.trim()}`,
                contact,
                plate_no
            };

            if (file) {
                updateData.driver_img = file.buffer;
                updateData.img_type = file.mimetype;
            } else if (existingDriver && existingDriver.driver_img) {
                updateData.driver_img = existingDriver.driver_img;
                updateData.img_type = existingDriver.img_type;
            }

            await tx.driver.update({
                where: {
                    id: parseInt(id, 10)
                },
                data: updateData
            });

            const updateDriver = await tx.driver.findUnique({
                where: { id: parseInt(id, 10) }
            });

            await elasticClient.index({
                index: 'drivers',
                id: updateDriver.id.toString(),
                document: {
                    driver_id: updateDriver.driver_id,
                    full_name: updateDriver.full_name,
                }
            })
        });

        io.emit('updated', { status: 200 });

        res.sendStatus(200);
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(err.status).json({ message: err.message });
        }

        if (err.message === 'DriverNotFound') {
            return res.status(404).json({ message: 'Driver not found or deleted' });
        }

        if (err.message === 'ExistContact') {
            return res.status(400).json({ message: 'Contact number already exist' });
        }

        res.status(500).json({ message: 'Internal Error' });
    }
}

const driverController = {
    dashboard_data,
    manage_users_data,
    addInfo,
    updateDevice,
    deleteDevice,
    updateDriver,
}

export default driverController;