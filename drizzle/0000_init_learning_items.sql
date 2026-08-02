CREATE TABLE `learning_items` (
	`id` text PRIMARY KEY NOT NULL,
	`dedup_key` text NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`original_text` text NOT NULL,
	`translated_text` text NOT NULL,
	`translation_result_json` text,
	`sentence_analysis_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "learning_items_kind_check" CHECK("learning_items"."kind" IN ('word', 'sentence')),
	CONSTRAINT "learning_items_source_check" CHECK("learning_items"."source" IN ('text', 'screenshot'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_items_dedup_key_unique` ON `learning_items` (`dedup_key`);--> statement-breakpoint
CREATE INDEX `learning_items_kind_index` ON `learning_items` (`kind`);--> statement-breakpoint
CREATE INDEX `learning_items_updated_at_index` ON `learning_items` ("updated_at" desc);