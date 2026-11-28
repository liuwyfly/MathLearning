-- CreateTable
CREATE TABLE `mathlearning_user` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `uid` CHAR(36) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `uk_user_uid`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_weixin_user` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `openid` VARCHAR(64) NOT NULL,
    `unionid` VARCHAR(64) NULL,
    `nickname` VARCHAR(64) NULL,
    `avatar_url` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_weixin_user_user_id`(`user_id`),
    UNIQUE INDEX `uk_weixin_user_openid`(`openid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `icon_path` VARCHAR(256) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` FLOAT NOT NULL DEFAULT 0,
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
    `name` VARCHAR(256) NOT NULL DEFAULT '',
    `oss_path` VARCHAR(352) NOT NULL,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `sort` FLOAT NOT NULL DEFAULT 0,
    `language` VARCHAR(6) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_markdown_article_id`(`article_id`),
    INDEX `idx_markdown_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_problem` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `math_text` TEXT NOT NULL,
    `answer` TEXT NOT NULL,
    `language` VARCHAR(6) NOT NULL,
    `sort` FLOAT NOT NULL DEFAULT 0,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_problem_article_id`(`article_id`),
    INDEX `idx_problem_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_problem_image` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(352) NOT NULL,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `problem_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_problem_image_article_id`(`article_id`),
    INDEX `idx_problem_image_problem_id`(`problem_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_complaint` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `status` VARCHAR(24) NOT NULL,
    `uid` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_complaint_uid`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_complaint_image` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(352) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `filename` VARCHAR(128) NOT NULL,
    `complaint_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_complaint_image_complaint_id`(`complaint_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mathlearning_complaint_reply` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `complaint_id` INTEGER UNSIGNED NOT NULL,
    `content` TEXT NOT NULL,
    `admin_uid` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_complaint_reply_complaint_id`(`complaint_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `mathlearning_article_image` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(352) NOT NULL,
    `article_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_article_image_article_id`(`article_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mathlearning_weixin_user` ADD CONSTRAINT `fk_weixin_user_user_id` FOREIGN KEY (`user_id`) REFERENCES `mathlearning_user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mathlearning_contents_articles` ADD CONSTRAINT `fk_contentsarticle_article_id` FOREIGN KEY (`article_id`) REFERENCES `mathlearning_article`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mathlearning_contents_articles` ADD CONSTRAINT `fk_contentsarticle_contents_id` FOREIGN KEY (`contents_id`) REFERENCES `mathlearning_contents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mathlearning_problem` ADD CONSTRAINT `fk_problem_article_id` FOREIGN KEY (`article_id`) REFERENCES `mathlearning_article`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mathlearning_problem_image` ADD CONSTRAINT `fk_problem_image_problem_id` FOREIGN KEY (`problem_id`) REFERENCES `mathlearning_problem`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mathlearning_complaint_image` ADD CONSTRAINT `fk_complaint_image_complaint_id` FOREIGN KEY (`complaint_id`) REFERENCES `mathlearning_complaint`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mathlearning_complaint_reply` ADD CONSTRAINT `fk_complaint_reply_complaint_id` FOREIGN KEY (`complaint_id`) REFERENCES `mathlearning_complaint`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
