import CarBrand from "../db/mongo/models/carBrand";
import { createClient } from 'redis';
import CarColor from "../db/mongo/models/carColor";
import Camera from "../db/mongo/models/camera";


export default async () => {
  const redis = createClient({ url: process.env['REDIS_URL'] });
  await redis.connect();

  (await CarBrand.find()).forEach(
    brand => redis.set(`brand:${brand.id}`, JSON.stringify(brand.toJSON()))
  );
  (await CarColor.find()).forEach(
    color => redis.set(`color:${color.id}`, JSON.stringify(color.toJSON()))
  );
  (await Camera.find()).forEach(
    camera => redis.set(`camera:${camera.id}`, JSON.stringify(camera.toJSON()))
  );
};