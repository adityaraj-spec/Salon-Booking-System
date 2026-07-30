import { Salon } from "../models/salon.models.js";

export const SalonRepository = {
  findById: (id, select = null, session = null) => {
    const query = Salon.findById(id);
    if (select) query.select(select);
    if (session) query.session(session);
    return query;
  },

  find: (filter = {}, options = {}) => {
    const { skip = 0, limit = 10, sort = { createdAt: -1 } } = options;
    return Salon.find(filter).sort(sort).skip(skip).limit(limit);
  },

  count: (filter = {}) => {
    return Salon.countDocuments(filter);
  },

  create: (salonData, session = null) => {
    if (session) {
      return Salon.create([salonData], { session }).then((docs) => docs[0]);
    }
    return Salon.create(salonData);
  },

  updateById: (id, updateData, session = null) => {
    const options = { new: true };
    if (session) options.session = session;
    return Salon.findByIdAndUpdate(id, { $set: updateData }, options);
  },
};
