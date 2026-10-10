-- AlterTable
ALTER TABLE `mathlearning_complaint_image`
    ADD COLUMN `original_name` VARCHAR(255) NOT NULL,
    ADD COLUMN `filename` VARCHAR(128) NOT NULL;
