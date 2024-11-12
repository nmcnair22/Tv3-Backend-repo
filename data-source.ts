// data-source.ts

import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables from .env file
loadEnv();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'business_central_db',
  entities: [__dirname + '/src/modules/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/src/migrations/*{.ts,.js}'],
  synchronize: true,
  logging: false,

  // Add the timezone and extra options here
  timezone: 'Z', // Use 'Z' for UTC, or adjust as needed ('local', '-08:00' for PST)
  extra: {
    dateStrings: true,
  },
});