"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashSoundDetectionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CrashSoundDetectionService = class CrashSoundDetectionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logWindow(userId, dto) {
        return this.prisma.crashSoundDetectionLog.create({
            data: {
                userId,
                incidentId: dto.incidentId,
                windowTimestamp: new Date(dto.windowTimestamp),
                topMatchedClass: dto.topMatchedClass,
                crashConfidence: dto.crashConfidence,
                thresholdUsed: dto.thresholdUsed,
                flaggedAsCrash: dto.flaggedAsCrash,
                combinedWithSensorSignal: dto.combinedWithSensorSignal ?? false,
            },
        });
    }
    async getHistory(userId, flaggedAsCrash, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = { userId };
        if (flaggedAsCrash !== undefined) {
            where.flaggedAsCrash = flaggedAsCrash;
        }
        const [logs, total] = await Promise.all([
            this.prisma.crashSoundDetectionLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.crashSoundDetectionLog.count({ where }),
        ]);
        return {
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
};
exports.CrashSoundDetectionService = CrashSoundDetectionService;
exports.CrashSoundDetectionService = CrashSoundDetectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrashSoundDetectionService);
//# sourceMappingURL=crash-sound-detection.service.js.map