-- AlterTable
ALTER TABLE "crash_sound_detection_logs" ADD COLUMN     "triggered_by_transient" BOOLEAN NOT NULL DEFAULT true;
