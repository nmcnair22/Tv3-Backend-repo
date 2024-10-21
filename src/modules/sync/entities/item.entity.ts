// src/modules/sync/entities/item.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';
import { SalesInvoiceLine } from './sales-invoice-line.entity';
  // Import related entities if they are defined
  // import { ItemCategory } from './item-category.entity';
  // import { UnitOfMeasure } from './unit-of-measure.entity';
  // import { TaxGroup } from './tax-group.entity';
  // import { GeneralProductPostingGroup } from './general-product-posting-group.entity';
  // import { InventoryPostingGroup } from './inventory-posting-group.entity';
  
  @Entity('item')
  @Index(['itemNo', 'apiSource'], { unique: true })
  export class Item {
    /** Primary Key: Item ID from the API */
    @PrimaryColumn({ type: 'char', length: 36 })
    id: string;
  
    /** Item Number */
    @Column({ name: 'item_no', type: 'varchar', length: 50 })
    itemNo: string;
  
    /** Display Name */
    @Column({ name: 'display_name', type: 'varchar', length: 100 })
    displayName: string;
  
    /** Additional Display Name */
    @Column({ name: 'display_name2', type: 'varchar', length: 100, nullable: true })
    displayName2?: string;
  
    /** Item Type */
    @Column({ type: 'varchar', length: 50 })
    type: string;
  
    /** Item Category */
    @Column({ name: 'item_category_id', type: 'char', length: 36, nullable: true })
    itemCategoryId?: string;
  
    @Column({ name: 'item_category_code', type: 'varchar', length: 50, nullable: true })
    itemCategoryCode?: string;
  
    // Uncomment if ItemCategory entity is defined
    // @ManyToOne(() => ItemCategory)
    // @JoinColumn({ name: 'item_category_id' })
    // itemCategory?: ItemCategory;
  
    /** Blocked Status */
    @Column({ type: 'boolean' })
    blocked: boolean;
  
    /** Global Trade Item Number (GTIN) */
    @Column({ type: 'varchar', length: 50, nullable: true })
    gtin?: string;
  
    /** Inventory Quantity */
    @Column({ type: 'int' })
    inventory: number;
  
    /** Unit Price */
    @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 2 })
    unitPrice: number;
  
    /** Price Includes Tax */
    @Column({ name: 'price_includes_tax', type: 'boolean' })
    priceIncludesTax: boolean;
  
    /** Unit Cost */
    @Column({ name: 'unit_cost', type: 'decimal', precision: 18, scale: 2 })
    unitCost: number;
  
    /** Tax Group */
    @Column({ name: 'tax_group_id', type: 'char', length: 36, nullable: true })
    taxGroupId?: string;
  
    @Column({ name: 'tax_group_code', type: 'varchar', length: 50, nullable: true })
    taxGroupCode?: string;
  
    // Uncomment if TaxGroup entity is defined
    // @ManyToOne(() => TaxGroup)
    // @JoinColumn({ name: 'tax_group_id' })
    // taxGroup?: TaxGroup;
  
    /** Base Unit of Measure */
    @Column({ name: 'base_unit_of_measure_id', type: 'char', length: 36, nullable: true })
    baseUnitOfMeasureId?: string;
  
    @Column({ name: 'base_unit_of_measure_code', type: 'varchar', length: 50, nullable: true })
    baseUnitOfMeasureCode?: string;
  
    // Uncomment if UnitOfMeasure entity is defined
    // @ManyToOne(() => UnitOfMeasure)
    // @JoinColumn({ name: 'base_unit_of_measure_id' })
    // baseUnitOfMeasure?: UnitOfMeasure;
  
    /** General Product Posting Group */
    @Column({ name: 'general_product_posting_group_id', type: 'char', length: 36, nullable: true })
    generalProductPostingGroupId?: string;
  
    @Column({ name: 'general_product_posting_group_code', type: 'varchar', length: 50, nullable: true })
    generalProductPostingGroupCode?: string;
  
    // Uncomment if GeneralProductPostingGroup entity is defined
    // @ManyToOne(() => GeneralProductPostingGroup)
    // @JoinColumn({ name: 'general_product_posting_group_id' })
    // generalProductPostingGroup?: GeneralProductPostingGroup;
  
    /** Inventory Posting Group */
    @Column({ name: 'inventory_posting_group_id', type: 'char', length: 36, nullable: true })
    inventoryPostingGroupId?: string;
  
    @Column({ name: 'inventory_posting_group_code', type: 'varchar', length: 50, nullable: true })
    inventoryPostingGroupCode?: string;
  
    // Uncomment if InventoryPostingGroup entity is defined
    // @ManyToOne(() => InventoryPostingGroup)
    // @JoinColumn({ name: 'inventory_posting_group_id' })
    // inventoryPostingGroup?: InventoryPostingGroup;
  
    /** Last Modified Date */
    @Column({ name: 'last_modified', type: 'datetime', nullable: true })
    lastModified?: Date;
  
    /** API Source */
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    /** One-to-Many relationship with SalesInvoiceLine */
    @OneToMany(() => SalesInvoiceLine, (salesInvoiceLine) => salesInvoiceLine.item)
    salesInvoiceLines: SalesInvoiceLine[];
  
    /** Timestamps */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }