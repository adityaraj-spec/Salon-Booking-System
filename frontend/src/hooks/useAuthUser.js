import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../api/axiosConfig";

export const useAuthUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get("/users/me");
        return response.data?.data?.user || null;
      } catch (err) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
};
