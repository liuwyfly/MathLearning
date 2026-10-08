-- CreateTable
CREATE TABLE `mathlearning_complaint_image` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(352) NOT NULL,
    `complaint_id` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_complaint_image_complaint_id`(`complaint_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mathlearning_complaint_image` ADD CONSTRAINT `fk_complaint_image_complaint_id` FOREIGN KEY (`complaint_id`) REFERENCES `mathlearning_complaint`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- RenameIndex
ALTER TABLE `mathlearning_complaint` RENAME INDEX `idx_complaint_uid` TO `idx_complaint_user_id`;
