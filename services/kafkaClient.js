const { Kafka } = require("kafkajs");
const Notification = require("../models/notificationModel");

const kafka = new Kafka({
  clientId: "medease-app",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "medease-group" });

let ioInstance = null;
let emailToSocketIdMap = null;

const connectKafka = async (io, emailSocketMap) => {
  ioInstance = io;
  emailToSocketIdMap = emailSocketMap;

  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: "notifications", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const notificationData = JSON.parse(message.value.toString());

        // Save notification to DB
        const notification = new Notification(notificationData);
        await notification.save();

        // Emit real-time notification if user connected
        const socketId = emailToSocketIdMap.get(notificationData.userId);
        if (socketId && ioInstance) {
          ioInstance.to(socketId).emit("new-notification", notificationData);
          console.log(`Real-time notification sent to user ${notificationData.userId}`);
        } else {
          console.log(`User ${notificationData.userId} not connected to socket`);
        }
      } catch (error) {
        console.error("Error processing Kafka notification:", error);
      }
    },
  });
};

module.exports = { producer, connectKafka };
