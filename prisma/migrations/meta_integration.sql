-- CreateTable for Meta Integration
-- Run this migration to add Meta Lead Ads support

-- Meta Webhook Events Table
CREATE TABLE IF NOT EXISTS `MetaWebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `leadgenId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NULL,
    `adId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NULL,
    `pageId` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `error` TEXT NULL,
    `leadId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `MetaWebhookEvent_leadgenId_key`(`leadgenId`),
    INDEX `MetaWebhookEvent_leadgenId_idx`(`leadgenId`),
    INDEX `MetaWebhookEvent_processed_idx`(`processed`),
    INDEX `MetaWebhookEvent_createdAt_idx`(`createdAt`),
    INDEX `MetaWebhookEvent_leadId_fkey`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Meta Configuration Table
CREATE TABLE IF NOT EXISTS `MetaConfig` (
    `id` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `pageName` VARCHAR(191) NULL,
    `pageAccessToken` TEXT NOT NULL,
    `verifyToken` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastVerified` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MetaConfig_pageId_key`(`pageId`),
    INDEX `MetaConfig_pageId_idx`(`pageId`),
    INDEX `MetaConfig_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add Foreign Key
ALTER TABLE `MetaWebhookEvent` ADD CONSTRAINT `MetaWebhookEvent_leadId_fkey` 
    FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
