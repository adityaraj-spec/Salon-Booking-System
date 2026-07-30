import { Booking } from "../models/booking.models.js";

export const BookingRepository = {
  findById: (id, session = null) => {
    const query = Booking.findById(id);
    if (session) query.session(session);
    return query;
  },

  findOverlappingBookings: ({ salonId, staffId, startTime, endTime, statuses }, session = null) => {
    const filter = {
      salon: salonId,
      status: { $in: statuses },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };
    if (staffId) filter.staff = staffId;

    const query = Booking.find(filter);
    if (session) query.session(session);
    return query;
  },

  countOverlappingBookings: ({ salonId, staffId, startTime, endTime, statuses }, session = null) => {
    const filter = {
      salon: salonId,
      status: { $in: statuses },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };
    if (staffId) filter.staff = staffId;

    const query = Booking.countDocuments(filter);
    if (session) query.session(session);
    return query;
  },

  create: (bookingData, session = null) => {
    if (session) {
      return Booking.create([bookingData], { session }).then((docs) => docs[0]);
    }
    return Booking.create(bookingData);
  },

  updateById: (id, updateData, session = null) => {
    const options = { new: true };
    if (session) options.session = session;
    return Booking.findByIdAndUpdate(id, { $set: updateData }, options);
  },
};
