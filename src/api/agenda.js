const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const handlePrismaError = require("../utils/handlePrismaError");

const router = Router();
const prisma = new PrismaClient();

router.get("/:id", async (req, res) => {
  try {
    const agenda = await prisma.agenda.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        days: {
          include: { hours: true },
        },
        business: {
          include: {
            Service: true,
            user: true,
          },
        },
      },
    });

    if (!agenda) {
      return res.status(404).json({ message: "Agenda not found" });
    }

    const openingHours = agenda.days.map((day) => {
      const hour = day.hours[0];
      return {
        day: day.weekDay,
        hours: hour ? `${hour.start} - ${hour.end}` : "Closed",
      };
    });

    agenda.openingHours = openingHours;

    res.json(agenda);
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, daysOfTheWeek, userId, businessId } = req.body;

    const week = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const agenda = await prisma.agenda.create({
      data: {
        name,
        userId,
        businessId,
        days: {
          create: daysOfTheWeek.map((day) => ({
            date: day.date,
            weekDay: week[day.date.toLowerCase()],
            hours: {
              create: day.hours.map((h) => ({
                start: h.start,
                end: h.end,
              })),
            },
          })),
        },
      },
      include: {
        days: {
          include: { hours: true },
        },
      },
    });

    res.json(agenda);
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const agendas = await prisma.agenda.findMany({
      where: { userId: parseInt(req.params.userId) },
      include: {
        days: {
          include: { hours: true },
        },
        business: true,
      },
    });

    res.json(agendas);
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.agenda.delete({
      where: { id: parseInt(req.params.id) },
      include: {
        days: {
          include: {
            hours: true,
          },
        },
      },
    });
    res.json({ message: "Agenda deleted successfully" });
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, daysOfTheWeek } = req.body;

    const week = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const agendaId = parseInt(req.params.id);

    const updatedAgenda = await prisma.agenda.update({
      where: { id: agendaId },
      data: {
        name,
        days: {
          deleteMany: {},
          create: daysOfTheWeek.map((day) => ({
            date: day.date,
            weekDay: week[day.date.toLowerCase()],
            hours: {
              create: day.hours.map((h) => ({
                start: h.start,
                end: h.end,
              })),
            },
          })),
        },
      },
      include: {
        days: {
          include: { hours: true },
        },
      },
    });

    res.json(updatedAgenda);
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

module.exports = router;
