import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private transporter;
    private readonly logger;
    constructor(configService: ConfigService);
    sendVerificationEmail(email: string, fullName: string, token: string): Promise<void>;
    sendPasswordResetEmail(email: string, fullName: string, token: string): Promise<void>;
    private sendMail;
    private logFallback;
}
