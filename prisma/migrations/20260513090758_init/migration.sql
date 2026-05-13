-- CreateTable
CREATE TABLE `mathlearning_article` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(256) NOT NULL,
    `title_en` VARCHAR(384) NULL,
    `contents_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `sort` FLOAT NOT NULL,

    INDEX `idx_article_contents_id`(`contents_id`),
    INDEX `idx_article_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_contents` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(256) NOT NULL,
    `name_en` VARCHAR(256) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_contents_articles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `content_id` INTEGER UNSIGNED NOT NULL,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `contentsId` INTEGER UNSIGNED NULL,

    INDEX `fk_contentsarticle_article_id`(`article_id`),
    INDEX `fk_contentsarticle_content_id`(`content_id`),
    UNIQUE INDEX `uk_content_article`(`content_id`, `article_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mathlearning_article` ADD CONSTRAINT `fk_article_contents_id` FOREIGN KEY (`contents_id`) REFERENCES `mathlearning_contents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mathlearning_contents_articles` ADD CONSTRAINT `fk_contentsarticle_article_id` FOREIGN KEY (`article_id`) REFERENCES `mathlearning_article`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
