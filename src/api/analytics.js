const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const handlePrismaError = require("../utils/handlePrismaError");

const router = Router();
const prisma = new PrismaClient();

router.get("/appointments/next/:businessId", async (req, res) => {
  try {
    const now = new Date();
    const businessId = parseInt(req.params.businessId);

    // Step 1: Fetch agendas for the given businessId
    const agendas = await prisma.agenda.findMany({
      where: { businessId },
      select: { id: true },
    });

    const agendaIds = agendas.map((agenda) => agenda.id);

    // Step 2: Fetch appointments for the retrieved agenda IDs
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now,
        },
        agendaId: { in: agendaIds },
      },
      orderBy: {
        startTime: "asc",
      },
      take: 5,
      include: {
        service: true,
        agenda: {
          include: {
            business: true,
          },
        },
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

router.get("/appointments/by-month/:year/:month/:businessId", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const businessId = parseInt(req.params.businessId);

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Step 1: Fetch agendas for the given businessId
    const agendas = await prisma.agenda.findMany({
      where: { businessId },
      select: { id: true },
    });

    const agendaIds = agendas.map((agenda) => agenda.id);

    // Step 2: Group appointments by serviceId for the retrieved agenda IDs
    const servicesCount = await prisma.appointment.groupBy({
      by: ["serviceId"],
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        agendaId: { in: agendaIds },
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

router.get("/appointments/profit/:year/:month/:userId/:businessId", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userId = parseInt(req.params.userId);
    const businessId = parseInt(req.params.businessId);

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const endDate = isCurrentMonth ? today : endOfMonth;

    // Step 1: Fetch agendas for the given businessId
    const agendas = await prisma.agenda.findMany({
      where: { businessId },
      select: { id: true },
    });

    const agendaIds = agendas.map((agenda) => agenda.id);

    // Step 2: Fetch appointments for the retrieved agenda IDs
    const appointments = await prisma.appointment.findMany({
      where: {
        employeeId: userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        agendaId: { in: agendaIds },
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