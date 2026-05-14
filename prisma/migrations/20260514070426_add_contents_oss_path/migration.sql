/*
  Warnings:

  - You are about to drop the column `contentsId` on the `mathlearning_contents_articles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `mathlearning_contents` ADD COLUMN `oss_path` VARCHAR(256) NULL;

-- AlterTable
ALTER TABLE `mathlearning_contents_articles` DROP COLUMN `contentsId`;
