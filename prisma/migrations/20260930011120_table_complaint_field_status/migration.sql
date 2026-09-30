/*
  Warnings:

  - Added the required column `status` to the `mathlearning_complaint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mathlearning_complaint` ADD COLUMN `status` VARCHAR(24) NOT NULL;
