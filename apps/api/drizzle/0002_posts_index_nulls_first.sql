DROP INDEX "posts_author_created_idx";--> statement-breakpoint
DROP INDEX "posts_created_idx";--> statement-breakpoint
CREATE INDEX "posts_author_created_idx" ON "posts" USING btree ("author_type","author_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "posts_created_idx" ON "posts" USING btree ("created_at" DESC NULLS FIRST);