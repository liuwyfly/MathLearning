/*
  Warnings:

  - You are about to drop the column `contents_id` on the `mathlearning_article` table. All the data in the column will be lost.
  - You are about to drop the column `sort` on the `mathlearning_article` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `mathlearning_article` DROP FOREIGN KEY `fk_article_contents_id`;

-- DropIndex
DROP INDEX `idx_article_contents_id` ON `mathlearning_article`;

-- DropIndex
DROP INDEX `idx_article_sort` ON `mathlearning_article`;

-- AlterTable
ALTER TABLE `mathlearning_article` DROP COLUMN `contents_id`,
    DROP COLUMN `sort`;

-- AlterTable
ALTER TABLE `mathlearning_contents_articles` ADD COLUMN `article_sort` FLOAT NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `idx_contentsarticle_article_sort` ON `mathlearning_contents_articles`(`article_sort`);

-- AddForeignKey
ALTER TABLE `mathlearning_contents_articles` ADD CONSTRAINT `fk_contentsarticle_contents_id` FOREIGN KEY (`contents_id`) REFERENCES `mathlearning_contents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
