import { ObjectId } from "mongodb";
import { getCollection } from "./db.js";

export type PasswordResetTokenDocument = {
  _id: ObjectId;
  user_id: ObjectId;
  token: string;
  expires_at: Date;
  created_at: Date;
};

export const getPasswordResetTokensCollection = () =>
  getCollection<PasswordResetTokenDocument>("password_reset_tokens");
