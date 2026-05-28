-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `sid` VARCHAR(191) NOT NULL,
    `data` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_sid_key`(`sid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `roleId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `labelNumber` VARCHAR(191) NULL,
    `qrCodePhotoPath` VARCHAR(191) NULL,
    `condition` ENUM('GOOD', 'MAINTENANCE', 'BROKEN', 'DISPOSED') NOT NULL DEFAULT 'GOOD',
    `roomId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventories_labelNumber_key`(`labelNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bhps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL,
    `roomId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_drafts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'LOCKED') NOT NULL DEFAULT 'DRAFT',
    `createdById` INTEGER NOT NULL,
    `reviewedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draftId` INTEGER NOT NULL,
    `type` ENUM('INVENTORY', 'BHP') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `quantity` INTEGER NOT NULL,
    `link` TEXT NULL,
    `replacedInventoryId` INTEGER NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `receiveDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `maintenanceDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NOT NULL,
    `conditionAfter` ENUM('GOOD', 'MAINTENANCE', 'BROKEN', 'DISPOSED') NOT NULL,
    `performedById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_bhp_usages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenanceLogId` INTEGER NOT NULL,
    `bhpId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bhps` ADD CONSTRAINT `bhps_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_drafts` ADD CONSTRAINT `procurement_drafts_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_drafts` ADD CONSTRAINT `procurement_drafts_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_items` ADD CONSTRAINT `procurement_items_draftId_fkey` FOREIGN KEY (`draftId`) REFERENCES `procurement_drafts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_items` ADD CONSTRAINT `procurement_items_replacedInventoryId_fkey` FOREIGN KEY (`replacedInventoryId`) REFERENCES `inventories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `inventories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_bhp_usages` ADD CONSTRAINT `maintenance_bhp_usages_maintenanceLogId_fkey` FOREIGN KEY (`maintenanceLogId`) REFERENCES `maintenance_logs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_bhp_usages` ADD CONSTRAINT `maintenance_bhp_usages_bhpId_fkey` FOREIGN KEY (`bhpId`) REFERENCES `bhps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
