const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const { producer } = require("../services/kafkaClient"); 

const getallappointments = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [{ userId: req.query.search }, { doctorId: req.query.search }],
        }
      : {};

    const appointments = await Appointment.find(keyword)
      .populate("doctorId")
      .populate("userId");
    return res.send(appointments);
  } catch (error) {
    res.status(500).send("Unable to get appointments");
  }
};

// Helper function to send notification to Kafka topic
const sendNotificationToKafka = async (notification) => {
  try {
    await producer.send({
      topic: "notifications",
      messages: [{ value: JSON.stringify(notification) }],
    });
  } catch (error) {
    console.error("Kafka notification send error:", error);
  }
};

const bookappointment = async (req, res) => {
  try {
    const appointment = new Appointment({
      date: req.body.date,
      time: req.body.time,
      doctorId: req.body.doctorId,
      room_id: req.body.room_id,
      userId: req.locals,
    });

    // Send notification to user asynchronously via Kafka
    await sendNotificationToKafka({
      userId: req.locals,
      content: `You booked an appointment with Dr. ${req.body.doctorname} for ${req.body.date} ${req.body.time}`,
    });

    // Fetch user details for doctor notification
    const user = await User.findById(req.locals);

    // Send notification to doctor asynchronously via Kafka
    await sendNotificationToKafka({
      userId: req.body.doctorId,
      content: `You have an appointment with ${user.firstname} ${user.lastname} on ${req.body.date} at ${req.body.time}`,
    });

    const result = await appointment.save();
    return res.status(201).send(result);
  } catch (error) {
    console.error("Book appointment error:", error);
    res.status(500).send("Unable to book appointment");
  }
};

const completed = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.body.appointid,
      { status: "Completed" },
      { new: true }
    );

    // Notify the patient asynchronously via Kafka
    await sendNotificationToKafka({
      userId: appointment.userId,
      content: `Your appointment with ${req.body.doctorname} has been completed`,
    });

    const user = await User.findById(appointment.userId);

    // Notify the doctor asynchronously via Kafka
    await sendNotificationToKafka({
      userId: appointment.doctorId,
      content: `Your appointment with ${user.firstname} ${user.lastname} has been completed`,
    });

    return res.status(201).send("Appointment completed");
  } catch (error) {
    console.error("Complete appointment error:", error);
    res.status(500).send("Unable to complete appointment");
  }
};

module.exports = {
  getallappointments,
  bookappointment,
  completed,
};
