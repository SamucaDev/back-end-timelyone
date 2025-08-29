-- CreateTable
CREATE TABLE "public"."Agenda" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgendaDay" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "agendaId" INTEGER NOT NULL,

    CONSTRAINT "AgendaDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgendaHour" (
    "id" SERIAL NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "agendaDayId" INTEGER NOT NULL,

    CONSTRAINT "AgendaHour_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Agenda" ADD CONSTRAINT "Agenda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgendaDay" ADD CONSTRAINT "AgendaDay_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "public"."Agenda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgendaHour" ADD CONSTRAINT "AgendaHour_agendaDayId_fkey" FOREIGN KEY ("agendaDayId") REFERENCES "public"."AgendaDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
