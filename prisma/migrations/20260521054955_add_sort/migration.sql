-- AlterTable
ALTER TABLE `mathlearning_article` MODIFY `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `mathlearning_contents` MODIFY `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `mathlearning_contents_articles` MODIFY `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `mathlearning_markdown` ADD COLUMN `sort` FLOAT NOT NULL DEFAULT 0,
    MODIFY `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX `idx_markdown_sort` ON `mathlearning_markdown`(`sort`);
