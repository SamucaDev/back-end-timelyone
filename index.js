const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const userRouter = require('./src/api/user')
const agendaRouter = require('./src/api/agenda')
const appointmentRouter = require('./src/api/appointment')
const serviceRouter = require('./src/api/service')

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());


app.use('/users', userRouter);
app.use('/agenda', agendaRouter);
app.use('/appointment', appointmentRouter);
app.use('/service', serviceRouter);


const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
