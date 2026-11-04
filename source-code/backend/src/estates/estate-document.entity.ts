import {
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateEntity } from './estate.entity';

/** Document metadata only — file upload storage (Cloudinary) is deferred, same as Collections photos. */
@Entity('estate_documents')
@Index('idx_estate_documents_estate', ['estateId'])
export class EstateDocumentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'estate_id', type: 'int' })
  @ForeignKey(() => EstateEntity, { name: 'estate_documents_estate_id_fkey' })
  estateId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    name: 'uploaded_on',
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  uploadedOn: string;
}
