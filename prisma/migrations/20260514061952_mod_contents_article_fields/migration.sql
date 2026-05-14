/*
  Warnings:

  - You are about to drop the column `content_id` on the `mathlearning_contents_articles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[contents_id,article_id]` on the table `mathlearning_contents_articles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contents_id` to the `mathlearning_contents_articles` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `fk_contentsarticle_content_id` ON `mathlearning_contents_articles`;

-- DropIndex
DROP INDEX `uk_content_article` ON `mathlearning_contents_articles`;

-- AlterTable
ALTER TABLE `mathlearning_contents_articles` DROP COLUMN `content_id`,
    ADD COLUMN `contents_id` INTEGER UNSIGNED NOT NULL;

-- CreateIndex
CREATE INDEX `fk_contentsarticle_contents_id` ON `mathlearning_contents_articles`(`contents_id`);

-- CreateIndex
CREATE UNIQUE INDEX `uk_content_article` ON `mathlearning_contents_articles`(`contents_id`, `article_id`);
