import { PrismaClient } from "@prisma/client"
import { esSearch } from "../utils/esSearch.js"
import timeHelper from '../utils/timeHelper.js'
const prisma = new PrismaClient();

const searchQuery = async (req, res) => {
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
            query = '',
            page = 0,
            fields = [],
            dashboard = false,
            manage_users = false,
            attendance = false,
            payment = false,
            data_analytics = false
        } = req.body;
        const isSearchMode = !!query;
        const take = isSearchMode ? undefined : 10;
        const skip = isSearchMode ? undefined : page * 10;

        let allowedFilters = [];

        if (dashboard) {
            allowedFilters = ['driver_id', 'full_name'];
        }

        if (manage_users) {
            allowedFilters = ['driver_id', 'full_name'];
        }

        if (attendance) {
            allowedFilters = ['driver_id', 'full_name'];
        }

        if (payment) {
            allowedFilters = ['driver_id', 'full_name'];
        }

        if (data_analytics) {
            allowedFilters = ['driver_id', 'full_name'];
        }

        const searchFields = fields && fields.length > 0 ? fields : allowedFilters;

        let where = { driver_id: { not: null } }

        const cleanQuery = query.trim().replace(/\s+/g, ' ');

        if (query) {
            const esResults = await esSearch(cleanQuery, searchFields, id);

            const driverIdsFromES = esResults.map(driver => driver.driver_id);

            where.driver_id = { in: driverIdsFromES };
        }

        if (dashboard) {
            const [drivers, totalCount] = await Promise.all([
                prisma.attendance.findMany({
                    skip,
                    take,
                    where: {
                        driver: { 
                            isDeleted: false,
                            admins: { some: { id: id } } 
                        },
                        admins: { some: { id: id } },
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
                    include: {
                        driver: true
                    }
                }),
                prisma.attendance.count({
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
                        ]
                    }
                })
            ]);

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

            const totalPages = Math.max(1, Math.ceil(totalCount / take));
            const currentPage = Math.min(page, totalPages - 1);

            res.status(200).json({
                drivers: recordsWithBase64Images,
                totalPages,
                currentPage
            });
        }

        if (manage_users) {
            const [drivers, totalCount] = await Promise.all([
                prisma.driver.findMany({
                    skip,
                    take,
                    where: { 
                        isDeleted: false,
                        admins: { some: { id: id } } 
                    },
                    orderBy: { id: 'asc' }
                }),
                prisma.driver.count({
                    where: { 
                        isDeleted: false,
                        admins: { some: { id: id } }
                    }
                })
            ]);

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

            const totalPages = Math.max(1, Math.ceil(totalCount / take));
            const currentPage = Math.min(page, totalPages - 1);

            res.status(200).json({
                drivers: driversWithBase64Images,
                totalPages,
                currentPage
            });
        }

        if (attendance || payment) {
            const drivers = await prisma.attendance.findMany({
                skip,
                take,
                where: {
                    driver: { 
                        isDeleted: false,
                        admins: { some: { id: id } } 
                    },
                    admins: { some: { id: id } },
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

            const totalCount = await prisma.attendance.count({
                where: {
                    driver_db_id: { not: null },
                    driver: {
                        isDeleted: false,
                        admins: { some: { id: id } }
                    },
                    admins: { some: { id: id } },
                    createdAt: {
                        gte: timeHelper.today(),
                        lt: timeHelper.tomorrow()
                    }
                }
            });

            const totalPages = Math.max(1, Math.ceil(totalCount / take));
            const currentPage = Math.min(page, totalPages - 1);

            res.status(200).json({
                drivers,
                totalPages,
                currentPage
            });
        }

        if (data_analytics) {
            const drivers = await prisma.attendance.findMany({
                where: {
                    driver_db_id: { not: null },
                    driver: {
                        admins: { some: { id: id } }
                    },  
                    admins: { some: { id: id } }
                },
                orderBy: { createdAt: 'desc' },
            });

            const driversWithPaid = drivers.map(driver => {
                const butaw = Number(driver.butaw) || 0;
                const boundary = Number(driver.boundary) || 0;
                const balance = Number(driver.balance) || 0;

                return {
                    ...driver,
                    total_balance: balance || 0,
                    total_paid: butaw + boundary
                }
            });

            res.status(200).json({ drivers: driversWithPaid });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Error' });
    }
}

const dateSearchQuery = async (req, res) => {
    try {
        const { id, authType, role } = req.user;

        if (!id || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin') {
            return res.sendStatus(401);
        }

        if (authType !== 'local' && authType !== 'google') {
            return res.sendStatus(401);
        }

        const doesExist = await prisma.admin.findUnique({ where: { id } });

        if (!doesExist) {
            return res.sendStatus(401);
        }

        const {
            driver_id,
            full_name,
            from_date,
            to_date
        } = req.body;

        const start = from_date ? new Date(from_date) : null;
        const end = to_date ? new Date(to_date) : null;

        if (end < start) {
            return res.status(400).json({ message: 'End date cannot be earlier than start date' });
        }

        if (start) {
            start.setHours(0, 0, 0, 0);
        }

        if (end) {
            end.setUTCHours(23, 59, 59, 999);
        }

        let where = {};

        if (driver_id && full_name && start && end) {
            if (start === null && end === null) {
                return res.status(400).json({ message: 'Please select an start date and end date' });
            }

            where = {
                driver_id,
                full_name: { contains: full_name },
                time_in: { gte: start, lte: end },
                driver: {
                    isDeleted: false,
                    admins: { some: { id: id } }
                },
                admins: { some: { id: id } },
                OR: [
                    { time_out: { gte: start } },
                    { time_out: null },
                ]
            }

            const driver = await prisma.attendance.findMany({ where, orderBy: { createdAt: 'desc' } });

            const driverWithPaid = driver.map(driver => {
                const butaw = Number(driver.butaw) || 0;
                const boundary = Number(driver.boundary) || 0;
                const balance = Number(driver.balance) || 0;

                return {
                    ...driver,
                    total_balance: balance || 0,
                    total_paid: butaw + boundary
                }
            });

            return res.status(200).json({
                drivers: driverWithPaid
            });
        } else if (start && end) {
            where = {
                time_in: { gte: start, lte: end },
                driver: {
                    isDeleted: false,
                    admins: { some: { id: id } }
                },
                adkmins: { some: { id: id } },
                OR: [
                    { time_out: { gte: start } },
                    { time_out: null },
                ]
            }

            const drivers = await prisma.attendance.findMany({ where, orderBy: { createdAt: 'desc' } });

            const driversWithPaid = drivers.map(driver => {
                const butaw = Number(driver.butaw) || 0;
                const boundary = Number(driver.boundary) || 0;
                const balance = Number(driver.balance) || 0;

                return {
                    ...driver,
                    total_balance: balance || 0,
                    total_paid: butaw + boundary
                }
            });

            return res.status(200).json({
                drivers: driversWithPaid
            });
        }
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const checkNameAvailability = async (req, res) => {
    try {
        const { fname, lname } = req.body;

        const admin = await prisma.admin.findFirst({
            where: { 
                AND: {
                    fname,
                    lname
                }
            },
            select: null
        });

        const isFullNameExist = admin;

        res.status(200).json({ exist: isFullNameExist });
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const searchController = {
    searchQuery,
    dateSearchQuery,
    checkNameAvailability
}

export default searchController;