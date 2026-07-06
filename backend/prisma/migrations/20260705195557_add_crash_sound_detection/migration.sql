-- CreateTable
CREATE TABLE "crash_sound_detection_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "incident_id" UUID,
    "window_timestamp" TIMESTAMP(3) NOT NULL,
    "top_matched_class" VARCHAR(50),
    "crash_confidence" DOUBLE PRECISION NOT NULL,
    "threshold_used" DOUBLE PRECISION NOT NULL,
    "flagged_as_crash" BOOLEAN NOT NULL,
    "combined_with_sensor_signal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crash_sound_detection_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "crash_sound_detection_logs" ADD CONSTRAINT "crash_sound_detection_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
