-- CreateTable
CREATE TABLE `mathlearning_complaint_reply` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `complaint_id` INTEGER UNSIGNED NOT NULL,
    `content` TEXT NOT NULL,
    `admin_uid` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_complaint_reply_complaint_id`(`complaint_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mathlearning_complaint_reply` ADD CONSTRAINT `fk_complaint_reply_complaint_id` FOREIGN KEY (`complaint_id`) REFERENCES `mathlearning_complaint`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
