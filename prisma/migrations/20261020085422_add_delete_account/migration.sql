-- CreateTable
CREATE TABLE `mathlearning_delete_account` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `uid` CHAR(36) NOT NULL,
    `status` VARCHAR(24) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_delete_account_uid`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
