const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://barathrajdev:f1r2e3e4@cluster0.tsojopp.mongodb.net/innoverse");

const timerSchema = new mongoose.Schema({
    startTime: Date,
    duration: Number,
    isRunning: Boolean
});

const Timer = mongoose.model("Timer", timerSchema);

let countdownActive = false;


// START TIMER (Admin Only)
app.post("/start", async (req, res) => {

    const duration = 24 * 60 * 60 * 1000; // 24 hrs

    const timer = await Timer.findOne();

    if ((timer && timer.isRunning) || countdownActive) {
        return res.json({ message: "Already Running" });
    }

    countdownActive = true;
    res.json({ message: "Countdown Started" });

    // Broadcast 5-4-3-2-1 to all clients
    let count = 5;
    io.emit("preCountdown", count);

    const countdownInterval = setInterval(async () => {
        count--;
        if (count <= 0) {
            clearInterval(countdownInterval);
            io.emit("preCountdownEnd");

            // Now start the actual timer
            await Timer.deleteMany({});
            const newTimer = new Timer({
                startTime: new Date(),
                duration,
                isRunning: true
            });
            await newTimer.save();
            countdownActive = false;

            io.emit("timerStarted");
        } else {
            io.emit("preCountdown", count);
        }
    }, 1000);
});


// GET TIMER
app.get("/timer", async (req, res) => {

    const timer = await Timer.findOne();

    if (!timer || !timer.isRunning)
        return res.json({ running: false });

    res.json({
        running: true,
        startTime: timer.startTime,
        duration: timer.duration
    });
});


// RESET TIMER (Secret Admin Route)
app.post("/reset", async (req, res) => {
    await Timer.deleteMany({});
    io.emit("timerReset");
    res.json({ message: "Timer Reset" });
});


io.on("connection", (socket) => {
    console.log("User connected");
});

server.listen(5000, () => {
    console.log("Server running on 5000");
});