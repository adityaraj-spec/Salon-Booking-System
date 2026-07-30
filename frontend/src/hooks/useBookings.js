import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../api/axiosConfig";

export const useUserBookings = () => {
  return useQuery({
    queryKey: ["myBookings"],
    queryFn: async () => {
      const response = await axiosInstance.get("/bookings/my-bookings");
      return response.data?.data;
    },
    staleTime: 30 * 1000,
  });
};

export const useAvailability = (salonId, date, staffId = null) => {
  return useQuery({
    queryKey: ["availability", salonId, date, staffId],
    queryFn: async () => {
      if (!salonId || !date) return null;
      const response = await axiosInstance.get(`/bookings/availability/${salonId}`, {
        params: { date, staffId },
      });
      return response.data?.data;
    },
    enabled: !!salonId && !!date,
    staleTime: 15 * 1000, // 15 seconds
  });
};

export const useCreateHold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (holdData) => {
      const response = await axiosInstance.post("/bookings/hold", holdData);
      return response.data?.data;
    },
    onSuccess: (data) => {
      if (data?.salon) {
        queryClient.invalidateQueries(["availability", data.salon]);
      }
    },
  });
};

export const useInitiateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingData) => {
      const response = await axiosInstance.post("/bookings/initiate", bookingData);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myBookings"]);
    },
  });
};
