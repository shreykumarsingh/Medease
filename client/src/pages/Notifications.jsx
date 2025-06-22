import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "../styles/notification.css";
import Empty from "../components/Empty";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import fetchData from "../helper/apiCall";
import { setLoading } from "../redux/reducers/rootSlice";
import Loading from "../components/Loading";
import { useSocket } from "../service/SocketContext";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.root);
  const socket = useSocket();

  const getAllNotif = async () => {
    try {
      dispatch(setLoading(true));
      const temp = await fetchData(`/notification/getallnotifs`);
      dispatch(setLoading(false));
      setNotifications(temp);
    } catch (error) {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    getAllNotif();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, [socket]);

  return (
    <>
      <Navbar />
      <section className="container notif-section">
        <h2 className="page-heading">Your Notifications</h2>

        {loading ? (
          <Loading />
        ) : notifications.length > 0 ? (
          <div className="notifications">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Content</th>
                  <th>Date</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {notifications?.map((ele, i) => (
                  <tr key={ele._id}>
                    <td>{i + 1}</td>
                    <td>{ele.content}</td>
                    <td>{ele.updatedAt.split("T")[0]}</td>
                    <td>{ele.updatedAt.split("T")[1].split(".")[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
      <Footer />
    </>
  );
};

export default Notifications;
