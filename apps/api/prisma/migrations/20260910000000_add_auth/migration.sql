CREATE TABLE "users" (
 "id" UUID NOT NULL, "username" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE TABLE "sessions" (
 "id" UUID NOT NULL, "tokenHash" TEXT NOT NULL, "userId" UUID NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
