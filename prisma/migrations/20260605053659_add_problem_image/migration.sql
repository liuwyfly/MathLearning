-- CreateTable
CREATE TABLE `mathlearning_problem_image` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(352) NOT NULL,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_problem_image_article_id`(`article_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
