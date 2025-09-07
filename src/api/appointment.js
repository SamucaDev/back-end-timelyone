const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

router.get("/:id", async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);

    if (isNaN(appointmentId)) {
      return res.status(400).json({ error: "Invalid appointment ID" });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        service: true,
        agenda: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json(appointment);
  } catch (err) {
    console.error("Error fetching appointment", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/business/:businessId", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    if (isNaN(businessId)) {
      return res.status(400).json({ error: "Invalid businessId" });
    }

    const agendas = await prisma.agenda.findMany({
      where: { businessId },
      include: {
        days: {
          include: { hours: true },
        },
        business: true
      },
    });

    res.json(agendas);
  } catch (err) {
    console.error("Error fetching agendas", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/slots", async (req, res) => {
  try {
    const { agendaId, appointmentDate, buffer = 0, duration } = req.body;

    const date = new Date(appointmentDate);
    const weekDay = date.getDay();

    const startOfDay = new Date(appointmentDate + "T00:00:00.000");
    const endOfDay = new Date(appointmentDate + "T23:59:59.999");

    const agendas = await prisma.agenda.findUnique({
      where: { id: agendaId },
      include: {
        days: {
          where: { weekDay },
          include: { hours: true },
        },
      },
    });

    if (!agendas || agendas.days.length === 0) {
      return res.status(404).json({ error: "Agenda not found" });
    }

    const events = await prisma.appointment.findMany({
      where: {
        agendaId,
        startTime: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const slotsAvailable = [];

    const openingHour = agendas.days[0].hours[0].start;
    const closingHour =
      agendas.days[0].hours[agendas.days[0].hours.length - 1].end;

    function timeToMinutes(time) {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    }

    function minutesToTime(mins) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    function formatDateToHour(date, timeZone = "Europe/Dublin") {
      const formatter = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone,
      });
      return formatter.format(new Date(date));
    }

    const eventsInMinutes = events.map((ev) => {
      const startHour = formatDateToHour(ev.startTime, "Europe/Dublin");
      const endHour = formatDateToHour(ev.endTime, "Europe/Dublin");
      const startMinutes = timeToMinutes(startHour);
      const endMinutes = timeToMinutes(endHour);

      return {
        id: ev.id,
        start: startMinutes,
        end: endMinutes,
        startHour,
        endHour,
      };
    });

    function hasConflict(slotStart, slotEnd) {
      let hasOverlap = false;

      eventsInMinutes.forEach((event) => {
        const overlap = slotStart < event.end && slotEnd > event.start;
        if (overlap) hasOverlap = true;
      });

      return hasOverlap;
    }

    let currentTime = openingHour;
    const closingMinutes = timeToMinutes(closingHour);

    while (timeToMinutes(currentTime) < closingMinutes) {
      const slotStartMinutes = timeToMinutes(currentTime);
      const slotEndMinutes = slotStartMinutes + duration + buffer;

      if (slotEndMinutes <= closingMinutes) {
        if (!hasConflict(slotStartMinutes, slotEndMinutes)) {
          slotsAvailable.push(currentTime);
        }
      }

      currentTime = minutesToTime(timeToMinutes(currentTime) + 30);
    }

    res.json({ slotsAvailable });
  } catch (err) {
    console.error("Error fetching slots", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { agendaId, startTime, endTime, employeeId, serviceId } = req.body;

    if (!agendaId || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "Missing required appointment fields" });
    }

    const clientData = req.body.client;

    if (!clientData || !clientData.name || !clientData.phone) {
      return res.status(400).json({ error: "Missing required client fields" });
    }

    let client = await prisma.appointmentClient.findFirst({
      where: { phone: clientData.phone },
    });

    if (!client) {
      client = await prisma.appointmentClient.create({
      data: {
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
      },
      });
    } else {
      client = await prisma.appointmentClient.update({
      where: { id: client.id },
      data: {
        name: clientData.name,
        email: clientData.email,
      },
      });
    }
    
    const appointment = await prisma.appointment.create({
      data: {
        agendaId,
        startTime: startTime,
        endTime: endTime,
        clientId: client.id,
        serviceId,
        employeeId,
      },
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error("Error creating appointment", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agenda/:agendaId", async (req, res) => {
  const { agendaId } = req.params;

  const events = await prisma.appointment.findMany({
    where: {
      agendaId: parseInt(agendaId),
      status: {
        not: 2,
      },
    },
    include: {
      client: true,
      service: true,
    },
  });

  res.json(events);
});

router.patch("/:id/status/cancel", async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);

    if (isNaN(appointmentId)) {
      return res.status(400).json({ error: "Invalid appointment ID" });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 2 },
    });

    res.json(updatedAppointment);
  } catch (err) {
    console.error("Error updating appointment status", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/details/:id", async (req, res) => {
  try {
    const agenda = await prisma.agenda.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        business: true,
        days: {
          include: { hours: true },
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

    const response = {
      businessName: agenda.business.name,
      phone: agenda.business.phone,
      email: agenda.business.email,
      address: agenda.business.address,
      openingHours,
      services: agenda.business.services,
    };

    res.json(response);
  } catch (error) {
    const handledError = handlePrismaError(error);
    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

module.exports = router;
