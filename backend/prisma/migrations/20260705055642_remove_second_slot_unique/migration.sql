-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat_openid" TEXT,
    "qq_openid" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "name" TEXT,
    "avatar" TEXT,
    "terms_accepted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VerifyCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "target" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "TermsVersion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '用户服务协议',
    "content" TEXT NOT NULL,
    "is_draft" INTEGER NOT NULL DEFAULT 1,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "About" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "content" TEXT,
    "banner_image" TEXT,
    "images" TEXT,
    "tickerType" TEXT DEFAULT 'news',
    "tickerItems" TEXT,
    "menu_groups" TEXT,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Consultant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "title" TEXT,
    "bio" TEXT,
    "specialties" TEXT,
    "education" TEXT,
    "years_exp" INTEGER NOT NULL DEFAULT 0,
    "consult_hours" INTEGER NOT NULL DEFAULT 0,
    "supervision_hours" INTEGER NOT NULL DEFAULT 0,
    "certifications" TEXT,
    "work_experience" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "discount_rate" REAL NOT NULL DEFAULT 1.0,
    "auto_confirm" INTEGER NOT NULL DEFAULT 0,
    "weekly_template" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consultant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "consultant_id" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_booked" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TimeSlot_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "consultant_id" INTEGER NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "second_slot_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "TimeSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_second_slot_id_fkey" FOREIGN KEY ("second_slot_id") REFERENCES "TimeSlot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "News" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "cover_image" TEXT,
    "video_url" TEXT,
    "type" TEXT NOT NULL DEFAULT 'news',
    "author" TEXT,
    "is_paid" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 0,
    "is_published" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OhCardCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "cover" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "word_cat_id" INTEGER,
    "img_src_cat_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OhCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER NOT NULL,
    "image_url" TEXT,
    "word" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OhCard_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "OhCardCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OhCardRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "note" TEXT,
    "audio_url" TEXT,
    "room_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OhCardRecord_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OhCardPreset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🃏',
    "color" TEXT NOT NULL DEFAULT '#4A7BBA',
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AssessmentScale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "introduction" TEXT,
    "instruction" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "scoringRule" TEXT NOT NULL,
    "scenarios" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scaleId" INTEGER NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "dimension" TEXT,
    "age_min" INTEGER,
    "age_max" INTEGER,
    "gender" TEXT,
    CONSTRAINT "AssessmentQuestion_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "AssessmentScale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "scaleId" INTEGER NOT NULL,
    "answers" TEXT NOT NULL,
    "totalScore" REAL NOT NULL,
    "dimensions" TEXT,
    "level" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voucherId" INTEGER,
    CONSTRAINT "AssessmentResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssessmentResult_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "AssessmentScale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssessmentResult_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "AssessmentVoucher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentVoucher" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "scaleId" INTEGER,
    "createdBy" INTEGER NOT NULL,
    "target_user_id" INTEGER,
    "usedBy" INTEGER,
    "usedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentVoucher_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "AssessmentScale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "event" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "news_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsFavorite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "news_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "news_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ActivityRegistration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone" TEXT NOT NULL,
    "news_id" INTEGER,
    "source" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AssessmentProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "scaleId" INTEGER NOT NULL,
    "answers" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssessmentAnswer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "resultId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    CONSTRAINT "AssessmentAnswer_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "AssessmentResult" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentInterpretation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scaleId" INTEGER NOT NULL,
    "dimension" TEXT,
    "calculationMethod" TEXT,
    "standardScore" REAL,
    "variance" REAL,
    "minScore" REAL NOT NULL,
    "maxScore" REAL NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "gender" TEXT,
    "isNormal" TEXT,
    "level" TEXT,
    "detail" TEXT NOT NULL,
    CONSTRAINT "AssessmentInterpretation_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "AssessmentScale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentFavorite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "scaleId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentFavorite_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "AssessmentScale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mdb_account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "no" INTEGER,
    "agemin" INTEGER,
    "agemax" INTEGER,
    "xb" TEXT,
    "hmid" INTEGER,
    "name" TEXT,
    "min" REAL,
    "max" REAL,
    "explain" TEXT
);

-- CreateTable
CREATE TABLE "mdb_average_sd" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "age" INTEGER,
    "gender" TEXT,
    "average" REAL,
    "sd" REAL
);

-- CreateTable
CREATE TABLE "mdb_convert_mmpi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_sex" TEXT,
    "lstyle" TEXT,
    "factor_number" TEXT,
    "original_score" INTEGER,
    "converted_score" INTEGER
);

-- CreateTable
CREATE TABLE "mdb_hmez" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agemin" INTEGER,
    "agemax" INTEGER,
    "xb" TEXT,
    "hmid" INTEGER,
    "ez" TEXT,
    "topid" TEXT
);

-- CreateTable
CREATE TABLE "mdb_toplr" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "no" INTEGER,
    "hmid" INTEGER,
    "topid" INTEGER,
    "hmna" TEXT,
    "toplr" TEXT,
    "chc" INTEGER,
    "a" TEXT,
    "b" TEXT,
    "c" TEXT,
    "d" TEXT,
    "e" TEXT,
    "f" TEXT,
    "g" TEXT,
    "h" TEXT,
    "i" TEXT,
    "j" TEXT,
    "ac" REAL,
    "bc" REAL,
    "cc" REAL,
    "dc" REAL,
    "ec" REAL,
    "fc" REAL,
    "gc" REAL,
    "hc" REAL,
    "ic" REAL,
    "jc" REAL,
    "picture" TEXT
);

-- CreateTable
CREATE TABLE "mdb_treename" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "parentid" INTEGER,
    "chc" INTEGER,
    "maxavg" REAL,
    "hmjg" TEXT,
    "max" REAL,
    "min" REAL,
    "csr" TEXT,
    "xb" TEXT
);

-- CreateTable
CREATE TABLE "mdb_tt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "no" INTEGER,
    "hmid" INTEGER,
    "topid" INTEGER,
    "hmna" TEXT,
    "toplr" TEXT,
    "chc" INTEGER,
    "a" TEXT,
    "b" TEXT,
    "c" TEXT,
    "d" TEXT,
    "e" TEXT,
    "f" TEXT,
    "g" TEXT,
    "h" TEXT,
    "i" TEXT,
    "j" TEXT,
    "ac" REAL,
    "bc" REAL,
    "cc" REAL,
    "dc" REAL,
    "ec" REAL,
    "fc" REAL,
    "gc" REAL,
    "hc" REAL,
    "ic" REAL,
    "jc" REAL,
    "picture" TEXT
);

-- CreateTable
CREATE TABLE "mdb_username" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "xb" TEXT,
    "csdate" TEXT,
    "tel" TEXT,
    "address" TEXT,
    "testgrou" TEXT
);

-- CreateTable
CREATE TABLE "mdb_usebb" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mzh" TEXT,
    "name" TEXT,
    "xb" TEXT,
    "csdate" TEXT,
    "hwno" TEXT
);

-- CreateTable
CREATE TABLE "mdb_usekb" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mzh" TEXT,
    "hwno" TEXT,
    "hwdate" TEXT,
    "hcm" TEXT,
    "wkg" TEXT,
    "tel" TEXT,
    "addr" TEXT,
    "cx" TEXT
);

-- CreateTable
CREATE TABLE "mdb_usexg" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mzh" TEXT,
    "hwno" TEXT,
    "name" TEXT,
    "ral" TEXT,
    "tel" TEXT
);

-- CreateTable
CREATE TABLE "mdb_usexx" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mzh" TEXT,
    "hwno" TEXT,
    "hmlr" TEXT,
    "hmjg" TEXT
);

-- CreateTable
CREATE TABLE "mdb_jg" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userid" TEXT,
    "username" TEXT,
    "timeing" TEXT,
    "hmna" TEXT,
    "tmc" TEXT,
    "sumcount" REAL,
    "avgcount" REAL,
    "maxavgcount" REAL,
    "exc" TEXT,
    "type" TEXT,
    "exlev" TEXT,
    "exavg" REAL,
    "bgr" TEXT
);

-- CreateTable
CREATE TABLE "mdb_jgmx" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jgid" INTEGER,
    "hmna" TEXT,
    "sumcount" REAL,
    "avgcount" REAL,
    "type" TEXT,
    "explain" TEXT
);

-- CreateTable
CREATE TABLE "mdb_jgmxx" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jgid" INTEGER,
    "topid" INTEGER,
    "sorc" INTEGER
);

-- CreateTable
CREATE TABLE "mdb_testsave" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hmid" INTEGER,
    "userid" TEXT,
    "topid" INTEGER,
    "ch" TEXT
);

-- CreateTable
CREATE TABLE "orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_no" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "booking_id" INTEGER,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pay_type" TEXT NOT NULL DEFAULT 'wxpay',
    "prepay_id" TEXT,
    "transaction_id" TEXT,
    "expire_at" DATETIME NOT NULL,
    "paid_at" DATETIME,
    "original_amount" INTEGER,
    "discount_rate" REAL NOT NULL DEFAULT 1.0,
    "user_package_id" INTEGER,
    "user_coupon_id" INTEGER,
    "coupon_discount" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_user_package_id_fkey" FOREIGN KEY ("user_package_id") REFERENCES "user_packages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_user_coupon_id_fkey" FOREIGN KEY ("user_coupon_id") REFERENCES "user_coupons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "consult_packages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "bonus_sessions" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_packages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "package_id" INTEGER NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "used_sessions" INTEGER NOT NULL DEFAULT 0,
    "paid_amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expire_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "consult_packages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "scope" TEXT NOT NULL DEFAULT 'consultation',
    "is_public" INTEGER NOT NULL DEFAULT 0,
    "per_user_limit" INTEGER NOT NULL DEFAULT 1,
    "total_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expire_at" DATETIME,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_coupons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "coupon_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "used_at" DATETIME,
    "used_order_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_coupons_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mood_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "mood" INTEGER NOT NULL,
    "note" TEXT,
    "tags" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "cbt_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "situation" TEXT NOT NULL,
    "auto_thought" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "evidence_for" TEXT,
    "evidence_against" TEXT,
    "balanced_thought" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "dream_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "dream_content" TEXT NOT NULL,
    "free_association" TEXT,
    "interpretation" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "iceberg_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "behavior" TEXT NOT NULL,
    "coping" TEXT,
    "feeling" TEXT,
    "feeling_of_feeling" TEXT,
    "belief" TEXT,
    "expectation" TEXT,
    "yearning" TEXT,
    "self" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "homework_help" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "consultant_id" INTEGER,
    "record_type" TEXT NOT NULL,
    "record_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reply" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rule_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "original_rule" TEXT NOT NULL,
    "context" TEXT,
    "source" TEXT,
    "original_function" TEXT,
    "cost" TEXT,
    "exceptions" TEXT,
    "new_rule" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_wechat_openid_key" ON "User"("wechat_openid");

-- CreateIndex
CREATE UNIQUE INDEX "User_qq_openid_key" ON "User"("qq_openid");

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_user_id_key" ON "Consultant"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_slot_id_key" ON "Booking"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentScale_code_key" ON "AssessmentScale"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentVoucher_code_key" ON "AssessmentVoucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "NewsLike_news_id_user_id_key" ON "NewsLike"("news_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "NewsFavorite_news_id_user_id_key" ON "NewsFavorite"("news_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentProgress_userId_scaleId_key" ON "AssessmentProgress"("userId", "scaleId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentFavorite_userId_scaleId_key" ON "AssessmentFavorite"("userId", "scaleId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "orders_booking_id_key" ON "orders"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
