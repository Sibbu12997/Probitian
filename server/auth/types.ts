export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  USER = 'user'
}

export enum Permission {
  CONTENT_READ = 'content:read',
  CONTENT_WRITE = 'content:write',
  EDIT_CONTENT = 'content:write',
  PUBLISH_CONTENT = 'campaigns:send',
  MEDIA_UPLOAD = 'media:upload',
  MEDIA_DELETE = 'media:delete',
  VIEW_ANALYTICS = 'messages:read',
  MANAGE_CRM = 'leads:write',
  MANAGE_SYSTEM = 'system:admin'
}

export interface AdminSession {
  token: string;
  email: string;
  role: UserRole;
  userId?: string;
  createdAt: number;
  expiresAt: number;
}

export interface SessionTokenPayload {
  email: string;
  role: UserRole;
  userId?: string;
  createdAt: number;
  expiresAt: number;
  nonce: string;
}
