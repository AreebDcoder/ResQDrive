-- CreateEnum
CREATE TYPE "AccidentReportSeverity" AS ENUM ('minor', 'moderate', 'severe');

-- CreateTable
CREATE TABLE "parts_scrape_logs" (
    "id" UUID NOT NULL,
    "search_query" VARCHAR(200) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "results_found" INTEGER NOT NULL,
    "results_after_filtering" INTEGER NOT NULL,
    "computed_min_price_pkr" INTEGER,
    "computed_max_price_pkr" INTEGER,
    "raw_listing_urls" JSONB,
    "scrape_duration_ms" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_scrape_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regional_emergency_numbers" (
    "id" UUID NOT NULL,
    "region_name" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "priority_order" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regional_emergency_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_custom_emergency_numbers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "priority_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_custom_emergency_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accident_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "incident_id" UUID,
    "severity" "AccidentReportSeverity" NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "detected_region" TEXT,
    "called_service_name" TEXT,
    "called_at" TIMESTAMP(3),
    "auto_dialed" BOOLEAN NOT NULL DEFAULT false,
    "damage_photo_urls" JSONB,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accident_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "regional_emergency_numbers" ADD CONSTRAINT "regional_emergency_numbers_updated_by_admin_id_fkey" FOREIGN KEY ("updated_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_custom_emergency_numbers" ADD CONSTRAINT "user_custom_emergency_numbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_reports" ADD CONSTRAINT "accident_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_reports" ADD CONSTRAINT "accident_reports_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
