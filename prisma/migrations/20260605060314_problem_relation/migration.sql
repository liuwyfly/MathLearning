/*
  Warnings:

  - Added the required column `problem_id` to the `mathlearning_problem_image` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mathlearning_problem_image` ADD COLUMN `problem_id` INTEGER UNSIGNED NOT NULL;

-- CreateIndex
CREATE INDEX `idx_problem_image_problem_id` ON `mathlearning_problem_image`(`problem_id`);

-- AddForeignKey
ALTER TABLE `mathlearning_problem_image` ADD CONSTRAINT `fk_problem_image_problem_id` FOREIGN KEY (`problem_id`) REFERENCES `mathlearning_problem`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
