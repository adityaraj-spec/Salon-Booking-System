import { User } from "../models/user.models.js";

export const UserRepository = {
  findById: (id, select = null, session = null) => {
    const query = User.findById(id);
    if (select) query.select(select);
    if (session) query.session(session);
    return query;
  },

  findByEmailOrUsername: (emailOrUsername, session = null) => {
    const query = User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (session) query.session(session);
    return query;
  },

  findByEmail: (email, session = null) => {
    const query = User.findOne({ email });
    if (session) query.session(session);
    return query;
  },

  create: (userData, session = null) => {
    if (session) {
      return User.create([userData], { session }).then((docs) => docs[0]);
    }
    return User.create(userData);
  },

  updateById: (id, updateData, session = null) => {
    const options = { new: true };
    if (session) options.session = session;
    return User.findByIdAndUpdate(id, { $set: updateData }, options);
  },
};
