import { ConfigService } from '@nestjs/config';
export declare class UploadService {
    private configService;
    private readonly logger;
    private useCloudinary;
    constructor(configService: ConfigService);
    uploadProfilePicture(file: Express.Multer.File): Promise<string>;
}
