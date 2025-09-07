const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const handlePrismaError = require("../utils/handlePrismaError");

const router = Router();
const prisma = new PrismaClient();

router.get("/appointments/next/:businessId", async (req, res) => {
  try {
    const now = new Date();
    const businessId = parseInt(req.params.businessId);

    const agendas = await prisma.agenda.findMany({
      where: { businessId },
      select: { id: true },
    });

    const agendaIds = agendas.map((agenda) => agenda.id);

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now,
        },
        agendaId: { in: agendaIds },
        status: 1,
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

router.get("/appointments/by-year/:year/:businessId", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const businessId = parseInt(req.params.businessId);

    const agendas = await prisma.agenda.findMany({
      where: { businessId },
      select: { id: true },
    });

    const agendaIds = agendas.map((agenda) => agenda.id);

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: new Date(year, 0, 1, 0, 0, 0),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
        agendaId: { in: agendaIds },
        status: 1,
      },
      select: {
        startTime: true,
        service: { select: { price: true } },
      },
    });

    const monthlyProfits = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: 0,
    }));

    appointments.forEach((appt) => {
      const month = appt.startTime.getMonth();
      monthlyProfits[month].total += appt.service.price;
    });

    const result = monthlyProfits.map((m) => ({
      month: new Date(year, m.month - 1).toLocaleString("default", {
        month: "short",
      }),
      total: m.total,
    }));
    console.log(result);
    res.json(result);
  } catch (error) {
    console.log(error);
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

router.get(
  "/appointments/profit/:year/:month/:userId/:businessId",
  async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const userId = parseInt(req.params.userId);
      const businessId = parseInt(req.params.businessId);

      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      const today = new Date();
      const isCurrentMonth =
        today.getFullYear() === year && today.getMonth() + 1 === month;
      const endDate = isCurrentMonth ? today : endOfMonth;

      const agendas = await prisma.agenda.findMany({
        where: { businessId },
        select: { id: true },
      });

      const agendaIds = agendas.map((agenda) => agenda.id);

      const appointments = await prisma.appointment.findMany({
        where: {
          employeeId: userId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          agendaId: { in: agendaIds },
          status: 1,
        },
        include: {
          service: { select: { price: true } },
        },
      });

      const total = appointments.reduce(
        (acc, curr) => acc + (curr.service?.price || 0),
        0
      );

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
  }
);

router.get(
  "/appointments/peak-hours/year/:year/:businessId",
  async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const businessId = parseInt(req.params.businessId);

      const startDate = new Date(year, 0, 1, 0, 0, 0);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const agendas = await prisma.agenda.findMany({
        where: { businessId },
        select: { id: true },
      });

      const agendaIds = agendas.map((agenda) => agenda.id);

      const appointments = await prisma.appointment.findMany({
        where: {
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          agendaId: { in: agendaIds },
          status: 1,
        },
        select: {
          startTime: true,
        },
      });

      const counts = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        total: 0,
      }));

      appointments.forEach((appt) => {
        const hour = new Date(appt.startTime).getHours();
        counts[hour].total += 1;
      });

      const now = new Date();
      const monthsElapsed =
        year === now.getFullYear() ? now.getMonth() + 1 : 12;

      const result = counts.map((item) => ({
        hour: item.hour,
        average: item.total / monthsElapsed,
      }));

      res.json(result);
    } catch (error) {
      const handledError = handlePrismaError(error);
      res.status(handledError.status).json({
        message: handledError.message,
        type: handledError.type,
      });
    }
  }
);

router.get("/appointments/by-weekday/:year/:businessId", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const businessId = parseInt(req.params.businessId);

    const startDate = new Date(year, 0, 1, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const agendas = await prisma.agenda.findMany({
      where: { businessId },
      select: { id: true },
    });

    const agendaIds = agendas.map((agenda) => agenda.id);

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        agendaId: { in: agendaIds },
        status: 1,
      },
      select: {
        startTime: true,
      },
    });

    const counts = Array.from({ length: 7 }, (_, i) => ({
      weekday: i,
      count: 0,
    }));

    appointments.forEach((appt) => {
      const weekday = new Date(appt.startTime).getDay();
      counts[weekday].count += 1;
    });

    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const result = counts.map((item) => ({
      day: weekdays[item.weekday],
      count: item.count,
    }));

    res.json(result);
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

router.get("/engagement/:businessId", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const agendas = await prisma.agenda.findMany({
      where: { businessId },
      select: { id: true },
    });
    const agendaIds = agendas.map((a) => a.id);

    const appointments = await prisma.appointment.findMany({
      where: { agendaId: { in: agendaIds }, status: 1 },
      include: {
        client: true,
        service: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
    });

    const engagementMap = {};
    appointments.forEach((appt) => {
      if (!appt.client) return;

      const clientId = appt.client.id;
      if (!engagementMap[clientId]) {
        engagementMap[clientId] = {
          id: clientId,
          name: appt.client.name,
          email: appt.client.email,
          phone: appt.client.phone,
          totalAppointments: 0,
          services: {},
          lastVisit: null,
        };
      }

      engagementMap[clientId].totalAppointments += 1;

      if (!engagementMap[clientId]?.lastVisit) {
        const date = new Date(appt.startTime);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        engagementMap[clientId].lastVisit = `${day}/${month}/${year}`;
      }

      const serviceName = appt.service?.name || "Unknown";
      if (!engagementMap[clientId].services[serviceName]) {
        engagementMap[clientId].services[serviceName] = 0;
      }
      engagementMap[clientId].services[serviceName] += 1;
    });

    const result = Object.values(engagementMap).map((client) => ({
      ...client,
      services: Object.entries(client.services).map(([service, count]) => ({
        service,
        count,
      })),
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching engagement data" });
  }
});

router.get("/engagement/user/:userId/:businessId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const businessId = parseInt(req.params.businessId);

    const client = await prisma.appointmentClient.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({
      ...client,
      business: business || null,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching engagement data for user" });
  }
});

router.get(
  "/appointments/services-by-year/:year/:businessId",
  async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const businessId = parseInt(req.params.businessId);

      const agendas = await prisma.agenda.findMany({
        where: { businessId },
        select: { id: true },
      });

      const agendaIds = agendas.map((a) => a.id);

      const servicesCount = await prisma.appointment.groupBy({
        by: ["serviceId"],
        where: {
          startTime: {
            gte: new Date(year, 0, 1, 0, 0, 0),
            lte: new Date(year, 11, 31, 23, 59, 59),
          },
          agendaId: { in: agendaIds },
          status: 1,
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
  }
);

module.exports = router;
