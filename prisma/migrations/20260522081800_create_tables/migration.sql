-- CreateTable
CREATE TABLE `mathlearning_article` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(256) NOT NULL,
    `title_en` VARCHAR(384) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_contents` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(256) NOT NULL,
    `name_en` VARCHAR(256) NULL,
    `oss_path` VARCHAR(256) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_contents_articles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `contents_id` INTEGER UNSIGNED NOT NULL,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `article_sort` FLOAT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_contentsarticle_article_id`(`article_id`),
    INDEX `idx_contentsarticle_article_sort`(`article_sort`),
    UNIQUE INDEX `uk_content_article`(`contents_id`, `article_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_markdown` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `oss_path` VARCHAR(352) NOT NULL,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `sort` FLOAT NOT NULL DEFAULT 0,
    `language` VARCHAR(6) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_markdown_article_id`(`article_id`),
    INDEX `idx_markdown_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mathlearning_contents_articles` ADD CONSTRAINT `fk_contentsarticle_article_id` FOREIGN KEY (`article_id`) REFERENCES `mathlearning_article`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mathlearning_contents_articles` ADD CONSTRAINT `fk_contentsarticle_contents_id` FOREIGN KEY (`contents_id`) REFERENCES `mathlearning_contents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
