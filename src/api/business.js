const {Router}  = require("express");
const {PrismaClient} = require("@prisma/client")

const router = Router();
const prisma = new PrismaClient();

router.get('/:businessId/me', async (req, res) => {
  try {
    const businessInfo = await prisma.business.findUnique({
      where: {
        id: parseInt(req.params.businessId),
      },
    });
    if (!businessInfo) {
      return res.status(404).json({ message: 'Business not found' });
    }
    res.json(businessInfo);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Internal server error', error });
  }
});


module.exports = router;
