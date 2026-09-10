import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const analyses=sqliteTable('analyses',{id:text('id').primaryKey(),createdAt:text('created_at').notNull(),mode:text('mode').notNull(),inputJson:text('input_json').notNull(),reportJson:text('report_json').notNull()});
export const findings=sqliteTable('findings',{id:text('id').primaryKey(),analysisId:text('analysis_id').notNull(),roundNumber:integer('round_number').notNull(),findingJson:text('finding_json').notNull()},table=>[index('idx_findings_analysis_round').on(table.analysisId,table.roundNumber)]);
