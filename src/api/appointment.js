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

    const startOfDay = new Date(appointmentDate + 'T00:00:00.000');
    const endOfDay = new Date(appointmentDate + 'T23:59:59.999');

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
    const closingHour = agendas.days[0].hours[agendas.days[0].hours.length - 1].end;

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
        endHour
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

    const client = await prisma.appointmentClient.create({
      data: {
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        agendaId,
        startTime: new Date(new Date(startTime).toLocaleString("en-GB", { timeZone: "Europe/Dublin" })),
        endTime: new Date(new Date(endTime).toLocaleString("en-GB", { timeZone: "Europe/Dublin" })),
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

  function getWeekRange(date) {
    const d = new Date(date);
  
    const day = d.getDay();
  
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);
  
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
  
    return { sunday, saturday };
  }

  const { sunday, saturday } = getWeekRange(new Date());
  
  const events = await prisma.appointment.findMany({
    where: {
      agendaId: parseInt(agendaId),
      startTime: {
        gte: sunday,
        lt: saturday,
      },
    },
    include: {
      client: true,
      service: true
    },
  });

  res.json(events);
});

module.exports = router;
