const { Router } = require("express");
const typeUsersEnum = require("../utils/enum/typeUsers");
const jwt = require("jsonwebtoken");

const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");
const handlePrismaError = require("../utils/handlePrismaError");

const router = Router();
const prisma = new PrismaClient();

const SECRET = process.env.SECRET_KEY;

router.post("/", async (req, res) => {
  try {
    const { body: userInformation } = req;

    const checkUser = await prisma.user.findUnique({
      where: { email: userInformation.email },
    });

    if (checkUser) {
      res.status(400).json({
        error: {
          message: "User already exists",
        },
      });
    }

    const hash = await argon2.hash(userInformation.password);

    const user = await prisma.user.create({
      data: {
        name: userInformation.ownerName,
        email: userInformation.email,
        password: hash,
        phone: userInformation.phone,
      },
    });

    if (userInformation.userType == typeUsersEnum.OWNER) {
      await prisma.business.create({
        data: {
          name: userInformation.businessName,
          address: userInformation.businessAddress,
          type: typeUsersEnum.OWNER,
          userId: user.id,
        },
      });
    }

    res.json({});
  } catch (error) {
    const handledError = handlePrismaError(error);

    res.status(handledError.status).json({
      message: handledError.message,
      type: handledError.type,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { body: login } = req;

    const user = await prisma.user.findUnique({
      where: { email: login.email },
      include: {
        Business: true
      }
    });

    console.log(user)

    const hash = await argon2.verify(user.password, login.password);

    if (user == null || !hash) {
      res.status(400).json({
        message: "Login or Password incorrect!",
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, businessId: user.Business[0].id },
      SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
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
