import Joi from "joi";
const smapleSchema = Joi.object({
  username: Joi.string().max(30).required(),
  email: Joi.string().email().required()
});
// const { error, value } = smapleSchema.validate(payload);