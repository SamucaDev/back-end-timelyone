const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const userRouter = require('./src/api/user')
const agendaRouter = require('./src/api/agenda')
const appointmentRouter = require('./src/api/appointment')
const serviceRouter = require('./src/api/service')
const analyticsRouter = require('./src/api/analytics')
const businessRouter = require('./src/api/business')

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
  

app.use('/users', userRouter);
app.use('/agenda', agendaRouter);
app.use('/appointment', appointmentRouter);
app.use('/service', serviceRouter);
app.use('/analytics', analyticsRouter);
app.use('/business', businessRouter);


const PORT = process.env.PORT || 8000;

app.listen(PORT,"0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
