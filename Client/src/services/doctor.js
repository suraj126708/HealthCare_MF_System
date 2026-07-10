import { api } from "./api";

export const doctorApi = {
  async listAppointments({ date, status } = {}) {
    const res = await api.get("/doctor/appointments", { params: { date, status } });
    return res?.data?.data;
  },

  async getAppointmentById({ appointmentId }) {
    const res = await api.get(`/doctor/appointments/${appointmentId}`);
    return res?.data?.data;
  },

  async completeAppointment({ appointmentId, clinicalNotes, prescription }) {
    const res = await api.post(`/doctor/appointments/${appointmentId}/complete`, {
      clinicalNotes,
      prescription,
    });
    return res?.data?.data;
  },

  async markLeave({ date, reason }) {
    const res = await api.post("/doctor/leave", { date, reason });
    return res?.data?.data;
  },
};

export default doctorApi;

