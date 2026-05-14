-- CreateTable
CREATE TABLE `mathlearning_markdown` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `oss_path` VARCHAR(352) NOT NULL,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_markdown_article_id`(`article_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
