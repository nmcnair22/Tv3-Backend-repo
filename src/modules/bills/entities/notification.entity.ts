import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { TemAccount } from './tem-account.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TemAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: TemAccount;

  @Column({ length: 50 })
  notification_module: string;

  @Column({ length: 50 })
  notification_type: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
