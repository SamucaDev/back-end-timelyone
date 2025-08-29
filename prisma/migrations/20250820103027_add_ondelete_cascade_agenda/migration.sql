-- DropForeignKey
ALTER TABLE "public"."AgendaDay" DROP CONSTRAINT "AgendaDay_agendaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AgendaHour" DROP CONSTRAINT "AgendaHour_agendaDayId_fkey";

-- AddForeignKey
ALTER TABLE "public"."AgendaDay" ADD CONSTRAINT "AgendaDay_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "public"."Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgendaHour" ADD CONSTRAINT "AgendaHour_agendaDayId_fkey" FOREIGN KEY ("agendaDayId") REFERENCES "public"."AgendaDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
