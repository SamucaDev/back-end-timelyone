const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

router.get("/appointments/next", async (req, res) => {
  try {
    const now = new Date();

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now, // apenas do momento atual para frente
        },
      },
      orderBy: {
        startTime: "asc", // ordena pelo horário mais próximo
      },
      take: 5, // limita aos 5 próximos
      include: {
        service: true,
        agenda: true,
        employee: {
          select: { id: true, name: true, email: true, phone: true },
        },
        client: true,
      },
    });

    res.json(appointments);
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

router.get("/appointments/by-month/:year/:month", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const servicesCount = await prisma.appointment.groupBy({
      by: ["serviceId"],
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        serviceId: true,
      },
    });

    const result = await Promise.all(
      servicesCount.map(async (item) => {
        const service = await prisma.service.findUnique({
          where: { id: item.serviceId },
          select: { id: true, name: true, price: true, duration: true },
        });

        return {
          service,
          count: item._count.serviceId,
        };
      })
    );

    res.json(result);
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});



router.get("/appointments/profit/:year/:month/:userId", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userId = parseInt(req.params.userId);

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);

    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const endDate = isCurrentMonth ? today : endOfMonth;

    const appointments = await prisma.appointment.findMany({
      where: {
        employeeId: userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: { select: { price: true } },
      },
    });

    const total = appointments.reduce((acc, curr) => acc + (curr.service?.price || 0), 0);

    res.json({
      userId,
      year,
      month,
      total,
      appointments: appointments.length,
      startDate,
      endDate,
    });
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

module.exports = router;