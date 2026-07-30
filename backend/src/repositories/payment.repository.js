import { Payment } from "../models/payment.models.js";

export const PaymentRepository = {
  findByOrderId: (razorpayOrderId, session = null) => {
    const query = Payment.findOne({ razorpayOrderId });
    if (session) query.session(session);
    return query;
  },

  findByBookingId: (bookingId, session = null) => {
    const query = Payment.findOne({ booking: bookingId });
    if (session) query.session(session);
    return query;
  },

  create: (paymentData, session = null) => {
    if (session) {
      return Payment.create([paymentData], { session }).then((docs) => docs[0]);
    }
    return Payment.create(paymentData);
  },

  updateByOrderId: (razorpayOrderId, updateData, session = null) => {
    const options = { new: true };
    if (session) options.session = session;
    return Payment.findOneAndUpdate({ razorpayOrderId }, { $set: updateData }, options);
  },
};
