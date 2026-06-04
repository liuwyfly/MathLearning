-- CreateTable
CREATE TABLE `mathlearning_problem` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `math_text` TEXT NOT NULL,
    `images` VARCHAR(352) NOT NULL,
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

-- AddForeignKey
ALTER TABLE `mathlearning_problem` ADD CONSTRAINT `fk_problem_article_id` FOREIGN KEY (`article_id`) REFERENCES `mathlearning_article`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
