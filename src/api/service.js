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

module.exports = router;
