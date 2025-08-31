const {Router}  = require("express");
const {PrismaClient} = require("@prisma/client")

const router = Router();
const prisma = new PrismaClient();

router.get("/user/:userId/business/:businessId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const businessId = parseInt(req.params.businessId);

  if (isNaN(userId) || isNaN(businessId)) {
    return res.status(400).json({ error: "Invalid userId or businessId" });
  }

  const services = await prisma.Service.findMany({
    where: { userId, businessId }
  });

  res.json(services)
})

router.get("/user/:userId/business/:businessId/app", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const businessId = parseInt(req.params.businessId);

  if (isNaN(userId) || isNaN(businessId)) {
    return res.status(400).json({ error: "Invalid userId or businessId" });
  }

  const services = await prisma.Service.findMany({
    where: { userId, businessId, active: true }
  });

  res.json(services)
})

router.post("/", async (req, res) => {
  try {
    const { businessId, name, price, duration, userId } = req.body;
    const newService = await prisma.Service.create({
      data: {
        businessId,
        name,
        price,
        duration,
        userId
      },
    });
    res.json(newService);
  } catch (error) {
    res.status(500).json({ error: "Error creating service" });
  }
});

// Update service status (active/inactive)
router.patch("/:id/status", async (req, res) => {
  try {
    const { active } = req.body;
    const updated = await prisma.Service.update({
      where: { id: parseInt(req.params.id) },
      data: { active },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error updating service status" });
  }
});

// Update service details
router.put("/:id", async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const appointments = await prisma.Appointment.findMany({
      where: { serviceId }
    });

    if (appointments.length > 0) {
      return res.status(400).json({ error: "You need to finalize all appointments before updating." });
    }

    const { name, price, duration, userId } = req.body;
    const updatedService = await prisma.Service.update({
      where: { id: serviceId },
      data: {
        name,
        price,
        duration,
        userId
      },
    });
    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ error: "Error updating service details" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const service = await prisma.Service.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving service" });
  }
});

// Delete service
router.delete("/:id", async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const appointments = await prisma.Appointment.findMany({
      where: { serviceId }
    });

    if (appointments.length > 0) {
      return res.status(400).json({ error: "You need to finalize all appointments before deleting." });
    }

    await prisma.Service.delete({
      where: { id: serviceId },
    });
    res.status(204).send(); // No content to send back
  } catch (error) {
    res.status(500).json({ error: "Error deleting service" });
  }
});

module.exports = router;
