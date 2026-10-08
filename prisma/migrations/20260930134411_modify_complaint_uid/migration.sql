/*
  Warnings:

  - You are about to drop the column `user_id` on the `mathlearning_complaint` table. All the data in the column will be lost.
  - Added the required column `uid` to the `mathlearning_complaint` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `idx_complaint_user_id` ON `mathlearning_complaint`;

-- AlterTable
ALTER TABLE `mathlearning_complaint` DROP COLUMN `user_id`,
    ADD COLUMN `uid` CHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX `idx_complaint_uid` ON `mathlearning_complaint`(`uid`);
