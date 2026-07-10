import { api } from "./api";

export const adminApi = {
  async listDoctors({ specialization } = {}) {
    const res = await api.get("/admin/doctors", { params: { specialization } });
    return res?.data?.data;
  },

  async getDoctorById({ doctorId }) {
    const res = await api.get(`/admin/doctors/${doctorId}`);
    return res?.data?.data;
  },

  async createDoctor(payload) {
    const res = await api.post("/admin/doctors", payload);
    return res?.data?.data;
  },

  async updateDoctor({ doctorId, payload }) {
    const res = await api.patch(`/admin/doctors/${doctorId}`, payload);
    return res?.data?.data;
  },

  async markDoctorLeave({ doctorId, date, reason }) {
    const res = await api.post(`/admin/doctors/${doctorId}/leave`, { date, reason });
    return res?.data?.data;
  },
};

export default adminApi;

