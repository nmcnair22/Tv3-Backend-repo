// src/modules/dynamics/dynamics.module.ts
import { HttpModule } from '@nestjs/axios'; // Correct import
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DynamicsService } from './dynamics.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule, // If DynamicsService uses ConfigService
  ],
  providers: [DynamicsService],
  exports: [DynamicsService],
})
export class DynamicsModule {}