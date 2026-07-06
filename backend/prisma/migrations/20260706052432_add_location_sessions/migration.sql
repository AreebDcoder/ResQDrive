-- CreateEnum
CREATE TYPE "LocationSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "location_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "incident_id" UUID,
    "share_token" VARCHAR(64) NOT NULL,
    "status" "LocationSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "last_update_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_sessions_share_token_key" ON "location_sessions"("share_token");

-- CreateIndex
CREATE INDEX "location_sessions_user_id_status_idx" ON "location_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "location_sessions_share_token_idx" ON "location_sessions"("share_token");

-- AddForeignKey
ALTER TABLE "location_sessions" ADD CONSTRAINT "location_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_sessions" ADD CONSTRAINT "location_sessions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
