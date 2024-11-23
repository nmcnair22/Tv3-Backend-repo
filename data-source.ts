   // data-source.ts

   import { config as loadEnv } from 'dotenv';
import * as glob from 'glob';
import * as path from 'path';
import { DataSource } from 'typeorm';

   // Load environment variables from .env file
   loadEnv();

   // Build the entities array by finding all entity files and excluding the specific one
   const allEntityFiles = glob.sync(
     path.join(__dirname, '/src/modules/**/*.entity.{ts,js}')
   );

   // Exclude 'tem-master-view-updated.entity.{ts,js}'
   const entities = allEntityFiles.filter(
     (file) =>
       !file.endsWith('tem-master-view-updated.entity.ts') &&
       !file.endsWith('tem-master-view-updated.entity.js')
   );

   export const AppDataSource = new DataSource({
     type: 'mysql',
     host: process.env.DB_HOST || 'localhost',
     port: parseInt(process.env.DB_PORT || '3306', 10),
     username: process.env.DB_USERNAME || 'root',
     password: process.env.DB_PASSWORD || 'password',
     database: process.env.DB_DATABASE || 'business_central_db',
     entities: entities, // Use the filtered entities array
     migrations: [__dirname + '/src/migrations/*{.ts,.js}'],
     synchronize: false, // or false, depending on your needs
     logging: false,

     // Additional options
     timezone: 'Z',
     extra: {
       dateStrings: false,
     },
   });

/**
 * TEM Database DataSource (Production Database)
 */
export const TemDataSource = new DataSource({
  type: 'mysql',
  host: process.env.TEM_DB_HOST, 
  port: parseInt(process.env.TEM_DB_PORT || '3306', 10), 
  username: process.env.TEM_DB_USERNAME,
  password: process.env.TEM_DB_PASSWORD,
  database: process.env.TEM_DB_DATABASE,
  entities: [
    __dirname +
      '/src/modules/bills/entities/tem-master-view-updated.entity.{ts,js}',
  ],
  synchronize: false,
  logging: false,
});
