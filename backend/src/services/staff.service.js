import { Staff } from "../models/staff.models.js";
import { Salon } from "../models/salon.models.js";
import ApiError from "../utils/apiError.js";

/**
 * Updates a staff member's weekly schedule.
 */
export const updateStaffSchedule = async ({ staffId, salonId, schedule }) => {
  const staff = await Staff.findOne({ _id: staffId, salon: salonId });
  if (!staff) {
    throw new ApiError(404, "Staff member not found or unauthorized");
  }

  staff.schedule = schedule;
  await staff.save();
  return staff;
};

/**
 * Adds a day off or holiday exception for a staff member.
 */
export const addStaffException = async ({ staffId, salonId, date, type = "day_off", reason }) => {
  const staff = await Staff.findOne({ _id: staffId, salon: salonId });
  if (!staff) {
    throw new ApiError(404, "Staff member not found or unauthorized");
  }

  // Remove duplicate exception for the same date if exists
  staff.exceptions = staff.exceptions.filter((ex) => ex.date !== date);
  staff.exceptions.push({ date, type, reason });

  await staff.save();
  return staff;
};

/**
 * Removes a staff exception by ID.
 */
export const removeStaffException = async ({ staffId, salonId, exceptionId }) => {
  const staff = await Staff.findOne({ _id: staffId, salon: salonId });
  if (!staff) {
    throw new ApiError(404, "Staff member not found or unauthorized");
  }

  staff.exceptions = staff.exceptions.filter((ex) => ex._id.toString() !== exceptionId.toString());
  await staff.save();
  return staff;
};

/**
 * Evaluates staff working status on a specific date.
 */
export const getStaffAvailabilityOnDate = async (staffId, dateStr) => {
  const staff = await Staff.findById(staffId);
  if (!staff || !staff.isActive) {
    return { isWorking: false, reason: "Staff member is inactive or unavailable" };
  }

  // Check exceptions first
  const exception = staff.exceptions.find((ex) => ex.date === dateStr);
  if (exception) {
    return { isWorking: false, reason: exception.reason || `Staff has a ${exception.type}` };
  }

  const date = new Date(dateStr);
  const dayOfWeek = date.getUTCDay();

  const daySchedule = staff.schedule.find((s) => s.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.isWorking) {
    return { isWorking: false, reason: "Staff member does not work on this day" };
  }

  return {
    isWorking: true,
    schedule: daySchedule,
  };
};
