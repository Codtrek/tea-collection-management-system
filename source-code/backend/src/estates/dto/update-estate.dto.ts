import { CreateEstateDto } from './create-estate.dto';

/**
 * EST-04 — same fields/validation as EST-02, single pre-filled form (the
 * portal reuses `estateOwnerSchema` for both). Route stays read-only: any
 * route info in the payload is ignored server-side.
 */
export class UpdateEstateDto extends CreateEstateDto {}
