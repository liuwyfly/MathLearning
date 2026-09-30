-- CreateTable
CREATE TABLE `mathlearning_complaint` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_complaint_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
