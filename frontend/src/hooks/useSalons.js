import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../api/axiosConfig";

export const useSalons = (params = {}) => {
  return useQuery({
    queryKey: ["salons", params],
    queryFn: async () => {
      const response = await axiosInstance.get("/salons", { params });
      return response.data?.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSalonDetail = (salonId) => {
  return useQuery({
    queryKey: ["salon", salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const response = await axiosInstance.get(`/salons/${salonId}`);
      return response.data?.data;
    },
    enabled: !!salonId,
    staleTime: 60 * 1000,
  });
};
