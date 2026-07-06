"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const admin_module_1 = require("./admin/admin.module");
const email_module_1 = require("./email/email.module");
const upload_module_1 = require("./upload/upload.module");
const vehicles_module_1 = require("./vehicles/vehicles.module");
const emergency_contacts_module_1 = require("./emergency-contacts/emergency-contacts.module");
const notifications_module_1 = require("./notifications/notifications.module");
const crash_sound_detection_module_1 = require("./crash-sound-detection/crash-sound-detection.module");
const voice_commands_module_1 = require("./voice-commands/voice-commands.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            admin_module_1.AdminModule,
            email_module_1.EmailModule,
            upload_module_1.UploadModule,
            vehicles_module_1.VehiclesModule,
            emergency_contacts_module_1.EmergencyContactsModule,
            notifications_module_1.NotificationsModule,
            crash_sound_detection_module_1.CrashSoundDetectionModule,
            voice_commands_module_1.VoiceCommandsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map