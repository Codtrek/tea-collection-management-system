import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Document metadata only — file upload storage (Cloudinary) is deferred, same as Collections photos. */
@Entity('estate_documents')
export class EstateDocumentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'estate_id' })
  estateId: number;

  @Column()
  name: string;

  @Column({ name: 'uploaded_on', type: 'date' })
  uploadedOn: string;
}
