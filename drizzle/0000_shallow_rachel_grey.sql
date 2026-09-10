CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`mode` text NOT NULL,
	`input_json` text NOT NULL,
	`report_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `findings` (
	`id` text PRIMARY KEY NOT NULL,
	`analysis_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`finding_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_findings_analysis_round` ON `findings` (`analysis_id`,`round_number`);