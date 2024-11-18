// src/modules/customers/customers.controller.ts

import { Controller, Get, Param } from '@nestjs/common';
import { Customer } from '../sync/entities/customer.entity';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async getAllCustomers(): Promise<Customer[]> {
    return this.customersService.findAll();
  }

  @Get(':customerNumber')
  async getCustomerByNumber(
    @Param('customerNumber') customerNumber: string,
  ): Promise<Customer> {
    return this.customersService.findOne(customerNumber);
  }
}
