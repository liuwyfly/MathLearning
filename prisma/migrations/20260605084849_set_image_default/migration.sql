/*
  Warnings:

  - You are about to drop the column `images` on the `mathlearning_problem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `mathlearning_problem` DROP COLUMN `images`,
    ADD COLUMN `image` VARCHAR(352) NOT NULL DEFAULT '';
