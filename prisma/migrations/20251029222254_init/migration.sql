-- CreateTable
CREATE TABLE `DeviceQueue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_id` INTEGER NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `google_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `fname` VARCHAR(191) NOT NULL,
    `lname` VARCHAR(191) NOT NULL,
    `admin_name` VARCHAR(191) NULL,
    `authType` VARCHAR(191) NOT NULL DEFAULT 'local',
    `role` VARCHAR(191) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `password` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `isActive` BOOLEAN NULL DEFAULT false,
    `lastVerified` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NULL DEFAULT false,

    UNIQUE INDEX `Admin_google_id_key`(`google_id`),
    UNIQUE INDEX `Admin_admin_name_key`(`admin_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driverAcc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `google_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `fname` VARCHAR(191) NOT NULL,
    `lname` VARCHAR(191) NOT NULL,
    `driver_name` VARCHAR(191) NULL,
    `authType` VARCHAR(191) NOT NULL DEFAULT 'local',
    `role` VARCHAR(191) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `password` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `isActive` BOOLEAN NULL DEFAULT false,
    `lastVerified` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `driverId` INTEGER NULL,

    UNIQUE INDEX `driverAcc_google_id_key`(`google_id`),
    UNIQUE INDEX `driverAcc_driver_name_key`(`driver_name`),
    UNIQUE INDEX `driverAcc_driverId_key`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `google_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `fname` VARCHAR(191) NOT NULL,
    `lname` VARCHAR(191) NOT NULL,
    `admin_name` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `token` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Token_google_id_key`(`google_id`),
    UNIQUE INDEX `Token_admin_name_key`(`admin_name`),
    UNIQUE INDEX `Token_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResetPasswordToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_name` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `tempFlag` VARCHAR(191) NOT NULL,
    `confirmed` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ResetPasswordToken_token_key`(`token`),
    UNIQUE INDEX `ResetPasswordToken_tempFlag_key`(`tempFlag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Driver` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `driver_img` LONGBLOB NULL,
    `img_type` VARCHAR(191) NULL,
    `driver_id` VARCHAR(191) NULL,
    `plate_no` VARCHAR(191) NULL,
    `card_id` VARCHAR(191) NULL,
    `dev_id` VARCHAR(191) NOT NULL,
    `dev_status_mode` VARCHAR(191) NULL,
    `dev_mode` BOOLEAN NULL,
    `fname` VARCHAR(191) NULL,
    `lname` VARCHAR(191) NULL,
    `full_name` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `driver_db_id` INTEGER NULL,
    `driver_id` VARCHAR(191) NULL,
    `full_name` VARCHAR(191) NULL,
    `driver_status` VARCHAR(191) NULL,
    `time_in` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `time_out` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `butaw` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `boundary` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `balance` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `paid` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestLeave` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `driver_acc_id` INTEGER NOT NULL,
    `driver_id` VARCHAR(191) NULL,
    `leaveType` VARCHAR(191) NOT NULL,
    `dateRange` VARCHAR(191) NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AdminDrivers` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_AdminDrivers_AB_unique`(`A`, `B`),
    INDEX `_AdminDrivers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AdminAttendances` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_AdminAttendances_AB_unique`(`A`, `B`),
    INDEX `_AdminAttendances_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `driverAcc` ADD CONSTRAINT `driverAcc_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_driver_db_id_fkey` FOREIGN KEY (`driver_db_id`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestLeave` ADD CONSTRAINT `RequestLeave_driver_acc_id_fkey` FOREIGN KEY (`driver_acc_id`) REFERENCES `driverAcc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdminDrivers` ADD CONSTRAINT `_AdminDrivers_A_fkey` FOREIGN KEY (`A`) REFERENCES `Admin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdminDrivers` ADD CONSTRAINT `_AdminDrivers_B_fkey` FOREIGN KEY (`B`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdminAttendances` ADD CONSTRAINT `_AdminAttendances_A_fkey` FOREIGN KEY (`A`) REFERENCES `Admin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdminAttendances` ADD CONSTRAINT `_AdminAttendances_B_fkey` FOREIGN KEY (`B`) REFERENCES `Attendance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
