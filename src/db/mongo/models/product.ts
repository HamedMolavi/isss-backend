import mongoose, { Schema } from "mongoose";
import { IProduct } from "../../../types/interfaces/product.interface";

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    images: Array<{ type: String, default: [] }>,
    product_code: { type: String, required: true },
    features: Array<{
      name: { type: String, required: true },
      value: { type: any, required: true }
    }>,
    face_log_id: { type: String, required: true },
    person_id: { type: Schema.Types.ObjectId, ref: "Personnel", required: true },
  },
  {
    collection: "Product",
    // toJSON: {
    //   transform(_doc, ret) {
    //     return ret;
    //   },
    // }
  }
);


// ProductSchema.post('save', balanceNewCamera);
// ProductSchema.post(["remove", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"], async (doc) => {
// });


// Compile model from schema
const Product = mongoose.model("Product", ProductSchema);
export default Product;
