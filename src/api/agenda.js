
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
        business: true
      },
    });

    if (!agenda) {
      return res.status(404).json({ message: "Agenda not found" });
    }

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
  console.log('entrei')
  try {
    const { name, daysOfTheWeek, userId, businessId } = req.body;

    const week = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
    }

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
    console.log(error)
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
      include:{
        days: {
          include: {
            hours: true
          }
        }
      }
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



module.exports = router;
