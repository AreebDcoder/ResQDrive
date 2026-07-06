-- CreateTable
CREATE TABLE "alert_dispatch_logs" (
    "id" UUID NOT NULL,
    "incident_id" UUID,
    "user_id" UUID NOT NULL,
    "push_status" TEXT NOT NULL DEFAULT 'PENDING',
    "sms_status" TEXT NOT NULL DEFAULT 'PENDING',
    "email_status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_dispatch_logs_pkey" PRIMARY KEY ("id")
);
