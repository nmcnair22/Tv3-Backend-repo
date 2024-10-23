import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveLastModifiedDateTimeFromBillingScheduleLine implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('billing_schedule_line', 'last_modified_date_time');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'billing_schedule_line',
      new TableColumn({
        name: 'last_modified_date_time',
        type: 'datetime',
        isNullable: true, // Make nullable to avoid issues if no data is provided
      }),
    );
  }
}