import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const editorState=sqliteTable('editor_state',{id:text('id').primaryKey(),body:text('body').notNull(),revision:integer('revision').notNull()});
