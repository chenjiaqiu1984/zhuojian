-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat_openid" TEXT,
    "qq_openid" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "name" TEXT,
    "avatar" TEXT,
    "terms_accepted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("avatar", "created_at", "email", "id", "name", "password", "phone", "qq_openid", "role", "terms_accepted_at", "username", "wechat_openid") SELECT "avatar", "created_at", "email", "id", "name", "password", "phone", "qq_openid", "role", "terms_accepted_at", "username", "wechat_openid" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_wechat_openid_key" ON "User"("wechat_openid");
CREATE UNIQUE INDEX "User_qq_openid_key" ON "User"("qq_openid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
