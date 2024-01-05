import { IModel } from "../../../types/interfaces/model.interface";
import { create } from "../create.database";
import Model from "../models/model";
import { read } from "../read.database";

export async function makeSeedModel(): Promise<IModel[]> {
  let models = [];
  if (!process.env["MODELS"]) return [];
  for (const modelCategory of process.env["MODELS"].split(",").map((el) => el.trim())) {
    if (!(await read(Model, { query: { category: modelCategory } })).length) {
      models.push(...await create(Model, {
        name: modelCategory + "0",
        category: modelCategory,
        uri: `models/${modelCategory}.onnx`
      }));
      console.log(`\t++ Seed data Model: name=${modelCategory}0`);
    };
  }
  return models;
};