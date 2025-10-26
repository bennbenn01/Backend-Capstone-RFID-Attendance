-- CreateTable
CREATE TABLE `Admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `google_id` VARCHAR(191) NULL,
    `facebook_id` VARCHAR(191) NULL,
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

    UNIQUE INDEX `Admin_google_id_key`(`google_id`),
    UNIQUE INDEX `Admin_facebook_id_key`(`facebook_id`),
    UNIQUE INDEX `Admin_admin_name_key`(`admin_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `google_id` VARCHAR(191) NULL,
    `facebook_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `fname` VARCHAR(191) NOT NULL,
    `lname` VARCHAR(191) NOT NULL,
    `admin_name` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `token` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Token_google_id_key`(`google_id`),
    UNIQUE INDEX `Token_facebook_id_key`(`facebook_id`),
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

    UNIQUE INDEX `Driver_card_id_key`(`card_id`),
    UNIQUE INDEX `Driver_dev_id_key`(`dev_id`),
    UNIQUE INDEX `Driver_contact_key`(`contact`),
    UNIQUE INDEX `Driver_driver_id_key`(`driver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
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

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `Driver`(`driver_id`) ON DELETE SET NULL ON UPDATE CASCADE;
