CREATE TABLE `cards` (
	`product_id` integer PRIMARY KEY NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`number` text,
	`sort_number` integer,
	`rarity` text,
	`image_url` text NOT NULL,
	`tcgplayer_url` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `sets`(`group_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cards_group_idx` ON `cards` (`group_id`);--> statement-breakpoint
CREATE INDEX `cards_name_idx` ON `cards` (`name`);--> statement-breakpoint
CREATE TABLE `chase_current` (
	`product_id` integer PRIMARY KEY NOT NULL,
	`group_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`tier` text NOT NULL,
	`market` real NOT NULL,
	`delta7` real,
	`delta7_pct` real,
	`delta30_pct` real,
	`computed_date` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chase_group_idx` ON `chase_current` (`group_id`);--> statement-breakpoint
CREATE INDEX `chase_tier_idx` ON `chase_current` (`tier`);--> statement-breakpoint
CREATE TABLE `chase_overrides` (
	`product_id` integer PRIMARY KEY NOT NULL,
	`forced_tier` text NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `collection_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`sub_type` text DEFAULT 'Normal' NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`condition` text,
	`acquired_price` real,
	`acquired_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `coll_user_idx` ON `collection_items` (`user_id`);--> statement-breakpoint
CREATE TABLE `eras` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_year` integer NOT NULL,
	`end_year` integer,
	`sort_order` integer NOT NULL,
	`accent` text DEFAULT '#2A75BB' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`items_written` integer DEFAULT 0 NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `jobs_job_idx` ON `job_runs` (`job`,`started_at`);--> statement-breakpoint
CREATE TABLE `portfolio_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`total_value` real NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `port_uq` ON `portfolio_snapshots` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `price_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`sub_type` text NOT NULL,
	`date` text NOT NULL,
	`low` real,
	`mid` real,
	`high` real,
	`market` real,
	`direct_low` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snap_uq` ON `price_snapshots` (`product_id`,`sub_type`,`date`);--> statement-breakpoint
CREATE INDEX `snap_product_date_idx` ON `price_snapshots` (`product_id`,`date`);--> statement-breakpoint
CREATE INDEX `snap_date_idx` ON `price_snapshots` (`date`);--> statement-breakpoint
CREATE TABLE `sealed_contents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`label` text NOT NULL,
	`quantity` integer,
	`verified` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `sealed_products`(`product_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `contents_product_idx` ON `sealed_contents` (`product_id`);--> statement-breakpoint
CREATE TABLE `sealed_products` (
	`product_id` integer PRIMARY KEY NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`product_type` text NOT NULL,
	`image_url` text NOT NULL,
	`tcgplayer_url` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `sets`(`group_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sealed_group_idx` ON `sealed_products` (`group_id`);--> statement-breakpoint
CREATE INDEX `sealed_type_idx` ON `sealed_products` (`product_type`);--> statement-breakpoint
CREATE TABLE `sets` (
	`group_id` integer PRIMARY KEY NOT NULL,
	`era_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`abbreviation` text,
	`release_date` text,
	`is_supplemental` integer DEFAULT false NOT NULL,
	`logo_url` text,
	`card_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`era_id`) REFERENCES `eras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sets_slug_uq` ON `sets` (`slug`);--> statement-breakpoint
CREATE INDEX `sets_era_idx` ON `sets` (`era_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);