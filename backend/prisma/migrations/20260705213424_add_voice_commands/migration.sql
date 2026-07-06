-- CreateEnum
CREATE TYPE "VoiceIntent" AS ENUM ('cancel', 'sos', 'unknown');

-- CreateTable
CREATE TABLE "voice_command_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "incident_id" UUID,
    "raw_transcript" TEXT NOT NULL,
    "classified_intent" "VoiceIntent" NOT NULL,
    "recognition_engine" VARCHAR(20) NOT NULL,
    "action_taken" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_command_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "voice_command_logs" ADD CONSTRAINT "voice_command_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
