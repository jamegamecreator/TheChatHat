import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio").default("").notNull(),
  avatar: text("avatar").default("").notNull(),
  status: text("status").default("Chilling").notNull(),
  isOwner: boolean("is_owner").default(false).notNull(),
  shadowbanned: boolean("shadowbanned").default(false).notNull(),
  banned: boolean("banned").default(false).notNull(),
  badges: jsonb("badges").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  isPrivate: boolean("is_private").default(false).notNull(),
  hidden: boolean("hidden").default(false).notNull(),
  locked: boolean("locked").default(false).notNull(),
  createdBy: text("created_by").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  channelId: text("channel_id").default("global").notNull(),
  userId: integer("user_id").default(0).notNull(),
  name: text("name").notNull(),
  content: text("content").default("").notNull(),
  type: text("type").default("text").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
  unlockAt: timestamp("unlock_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  requester: text("requester").notNull(),
  addressee: text("addressee").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
