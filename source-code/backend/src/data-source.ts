import 'dotenv/config';
import { DataSource } from 'typeorm';
const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

export default new DataSource({
  type: 'postgres',
  url,
  ssl: url?.includes('neon.tech') ? true : false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});