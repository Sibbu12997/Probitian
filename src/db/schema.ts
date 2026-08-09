import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category'),
  description: text('description'),
  fullDescription: text('full_description'),
  toolsUsed: jsonb('tools_used').$type<string[]>(),
  imagePlaceholder: text('image_placeholder'),
  galleryUrls: jsonb('gallery_urls').$type<string[]>(),
  kpis: jsonb('kpis').$type<{label: string, value: string, change: string}[]>(),
  featured: boolean('featured').default(false),
  published: boolean('published').default(false),
  githubUrl: text('github_url'),
  liveDemoUrl: text('live_demo_url'),
  youtubeUrl: text('youtube_url'),
  tags: jsonb('tags').$type<string[]>(),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const blogs = pgTable('blogs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug'),
  excerpt: text('excerpt'),
  content: text('content'),
  category: text('category'),
  date: text('date'),
  readTime: text('read_time'),
  author: text('author'),
  imageUrl: text('image_url'),
  tags: jsonb('tags').$type<string[]>(),
  status: text('status').default('published'),
  scheduledAt: text('scheduled_at'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const videos = pgTable('videos', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  duration: text('duration'),
  views: text('views'),
  url: text('url'),
  youtubeId: text('youtube_id'),
  category: text('category'),
  playlist: text('playlist'),
  tags: jsonb('tags').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const courses = pgTable('courses', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug'),
  icon: text('icon'),
  level: text('level'),
  description: text('description'),
  modulesCount: integer('modules_count'),
  duration: text('duration'),
  keyTakeaways: jsonb('key_takeaways').$type<string[]>(),
  syllabus: jsonb('syllabus').$type<{title: string, duration: string, type: string}[]>(),
  thumbnail: text('thumbnail'),
  videoUrl: text('video_url'),
  pdfUrl: text('pdf_url'),
  category: text('category'),
  published: boolean('published').default(false),
  resources: jsonb('resources').$type<{name: string, url: string, type: string}[]>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  courseInterested: text('course_interested'),
  subject: text('subject'),
  message: text('message').notNull(),
  status: text('status').default('new'),
  adminNotes: text('admin_notes'),
  replyMessage: text('reply_message'),
  repliedAt: text('replied_at'),
  replyStatus: text('reply_status').default('none'),
  emailSentStatus: text('email_sent_status'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const newsletter = pgTable('newsletter', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const media = pgTable('media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  sizeBytes: integer('size_bytes'),
  mimeType: text('mime_type'),
  folder: text('folder'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

