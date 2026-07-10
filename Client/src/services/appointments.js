import { api } from "./api";

export const appointmentsApi = {
  async holdSlot({ doctorId, slotStart }) {
    const res = await api.post("/patients/appointments/hold", { doctorId, slotStart });
    return res?.data?.data;
  },

  async submitSymptoms({ appointmentId, symptoms }) {
    const res = await api.post(`/patients/appointments/${appointmentId}/symptoms`, {
      symptoms,
    });
    return res?.data?.data;
  },

  async confirm({ appointmentId }) {
    const res = await api.post(`/patients/appointments/${appointmentId}/confirm`);
    return res?.data?.data;
  },

  async list({ status, date } = {}) {
    const res = await api.get("/patients/appointments", { params: { status, date } });
    return res?.data?.data;
  },

  async getById({ appointmentId }) {
    const res = await api.get(`/patients/appointments/${appointmentId}`);
    return res?.data?.data;
  },

  async cancel({ appointmentId, reason }) {
    const res = await api.delete(`/patients/appointments/${appointmentId}`, { data: { reason } });
    return res?.data?.data;
  },
};

