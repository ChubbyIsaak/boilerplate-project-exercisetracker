const Express = require('express');
const CORS = require('cors');
const UserModel = require('./models/UserSchema');
const ExerciseModel = require('./models/ExerciseSchema');
const LogModel = require('./models/LogSchema');
require('dotenv').config();
require('./config/db.config').connectDB();

const App = Express();

App.use(CORS());
App.use(Express.urlencoded({ extended: false }));
App.use(Express.json());
App.use(Express.static('public'));

App.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// saving a user in the database
App.post('/api/users', async (req, res) => {
  try {
    const newUser = await UserModel.create({
      username: req.body.username
    });
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// get all users
App.get('/api/users', async (req, res) => {
  try {
    const allUsers = await UserModel.find();
    res.json(allUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// save exercises for the specified user
App.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await UserModel.findById(req.params._id);
    if (!user) {
      return res.status(404).send('User Not Found!');
    }

    let dateInput = req.body.date ? new Date(req.body.date) : new Date();
    const newExercise = await ExerciseModel.create({
      user_id: user._id,
      username: user.username,
      description: req.body.description,
      duration: req.body.duration,
      date: dateInput
    });

    await LogModel.updateOne(
      { _id: newExercise.user_id },
      { $push: { log: { description: newExercise.description, duration: newExercise.duration, date: newExercise.date } } },
      { upsert: true }
    );

    res.json({
      _id: newExercise.user_id,
      username: newExercise.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: new Date(newExercise.date).toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// access all logs of any user
App.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;

    // Fetch user log by ID
    const userLog = await LogModel.findById(req.params._id);
    if (!userLog) {
      return res.status(404).send('User Log Not Found!');
    }

    // Filter the log based on date range if 'from' and 'to' are specified
    let filteredLogs = userLog.log;
    if (from) {
      const fromDate = new Date(from);
      filteredLogs = filteredLogs.filter(log => new Date(log.date) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59); // Include the entire 'to' day
      filteredLogs = filteredLogs.filter(log => new Date(log.date) <= toDate);
    }

    // Apply the limit to the number of logs returned
    if (limit) {
      filteredLogs = filteredLogs.slice(0, parseInt(limit));
    }

    // Convert dates for output
    const logObj = filteredLogs.map(obj => ({
      description: obj.description,
      duration: obj.duration,
      date: new Date(obj.date).toDateString()
    }));

    res.json({
      _id: userLog._id,
      username: userLog.username,
      count: filteredLogs.length, // Count of logs after filtering
      log: logObj
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



const CONN_PORT = process.env.PORT || 3358;
App.listen(CONN_PORT,
  () => console.log(`Your App is Listening at http://localhost:${CONN_PORT}`)
);