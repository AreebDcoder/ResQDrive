import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private useCloudinary = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.useCloudinary = true;
      this.logger.log('Cloudinary initialized successfully.');
    } else {
      this.logger.warn('Cloudinary config missing. Falling back to local storage uploads.');
    }
  }

  async uploadProfilePicture(file: Express.Multer.File): Promise<string> {
    if (this.useCloudinary) {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'resqdrive/profiles' },
          (error, result) => {
            if (error) {
              this.logger.error(`Cloudinary upload failed: ${error.message}`);
              reject(error);
            } else {
              resolve(result.secure_url);
            }
          }
        ).end(file.buffer);
      });
    } else {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.promises.writeFile(filePath, file.buffer);
      
      return `http://localhost:3000/uploads/${fileName}`;
    }
  }
}
