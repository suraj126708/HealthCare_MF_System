import { api } from "./api";

export const doctorsApi = {
  async searchDoctors({ specialization = "", q = "" } = {}) {
    const res = await api.get("/patients/doctors", { params: { specialization, q } });
    return res?.data?.data;
  },

  async getAvailability({ doctorId, date }) {
    const res = await api.get(`/patients/doctors/${doctorId}/availability`, {
      params: { date },
    });
    return res?.data?.data;
  },
};

