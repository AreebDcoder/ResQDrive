-- CreateEnum
CREATE TYPE "NotificationSessionStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'CANCELLED', 'EXPIRED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'SMS', 'EMAIL', 'PHONE_CALL');

-- CreateEnum
CREATE TYPE "NotificationAttemptStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'ACKNOWLEDGED');

-- CreateTable
CREATE TABLE "notification_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "incident_id" UUID,
    "location_session_id" UUID,
    "share_token" VARCHAR(64) NOT NULL,
    "status" "NotificationSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by" VARCHAR(100),
    "current_priority" INTEGER NOT NULL DEFAULT 1,
    "next_escalation_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_attempts" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "contact_name" VARCHAR(100) NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "contact_email" VARCHAR(150),
    "priority_order" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "dispatched_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_sessions_share_token_key" ON "notification_sessions"("share_token");

-- CreateIndex
CREATE INDEX "notification_sessions_user_id_status_idx" ON "notification_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "notification_sessions_status_next_escalation_at_idx" ON "notification_sessions"("status", "next_escalation_at");

-- CreateIndex
CREATE INDEX "notification_sessions_share_token_idx" ON "notification_sessions"("share_token");

-- CreateIndex
CREATE INDEX "notification_attempts_session_id_priority_order_idx" ON "notification_attempts"("session_id", "priority_order");

-- CreateIndex
CREATE INDEX "notification_attempts_status_idx" ON "notification_attempts"("status");

-- AddForeignKey
ALTER TABLE "notification_sessions" ADD CONSTRAINT "notification_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_sessions" ADD CONSTRAINT "notification_sessions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_sessions" ADD CONSTRAINT "notification_sessions_location_session_id_fkey" FOREIGN KEY ("location_session_id") REFERENCES "location_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "notification_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
