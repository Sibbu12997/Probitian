import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define users table linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Example domain table for CMS / Admin application data
export const cmsItems = pgTable('cms_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').default('general'),
  status: text('status').default('published'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  cmsItems: many(cmsItems),
}));

export const cmsItemsRelations = relations(cmsItems, ({ one }) => ({
  author: one(users, {
    fields: [cmsItems.userId],
    references: [users.id],
  }),
}));
