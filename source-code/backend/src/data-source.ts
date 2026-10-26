
import "dotenv/config";
import { DataSource } from "typeorm";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

export default new DataSource({
  type: "postgres",
  url: databaseUrl,
  entities: [],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: false,
});
