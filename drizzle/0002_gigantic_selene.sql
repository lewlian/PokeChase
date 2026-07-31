CREATE TABLE `graded_prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`source` text NOT NULL,
	`grade` text NOT NULL,
	`price` real NOT NULL,
	`matched_name` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `graded_uq` ON `graded_prices` (`product_id`,`source`,`grade`);--> statement-breakpoint
CREATE INDEX `graded_product_idx` ON `graded_prices` (`product_id`);