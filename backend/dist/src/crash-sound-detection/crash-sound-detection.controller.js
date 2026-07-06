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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashSoundDetectionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const crash_sound_detection_service_1 = require("./crash-sound-detection.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const create_detection_log_dto_1 = require("./dto/create-detection-log.dto");
let CrashSoundDetectionController = class CrashSoundDetectionController {
    constructor(crashSoundService) {
        this.crashSoundService = crashSoundService;
    }
    async logWindow(user, dto) {
        return this.crashSoundService.logWindow(user.id, dto);
    }
    async getHistory(user, flaggedAsCrash, page, limit) {
        const flaggedAsCrashBool = flaggedAsCrash !== undefined ? flaggedAsCrash === 'true' : undefined;
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        return this.crashSoundService.getHistory(user.id, flaggedAsCrashBool, pageNum, limitNum);
    }
};
exports.CrashSoundDetectionController = CrashSoundDetectionController;
__decorate([
    (0, common_1.Post)('log'),
    (0, swagger_1.ApiOperation)({ summary: 'Log a rolling 2-second audio window analysis result' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_detection_log_dto_1.CreateDetectionLogDto]),
    __metadata("design:returntype", Promise)
], CrashSoundDetectionController.prototype, "logWindow", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated history of the user's sound detection logs for tuning" }),
    (0, swagger_1.ApiQuery)({ name: 'flaggedAsCrash', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('flaggedAsCrash')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CrashSoundDetectionController.prototype, "getHistory", null);
exports.CrashSoundDetectionController = CrashSoundDetectionController = __decorate([
    (0, swagger_1.ApiTags)('Crash Sound Detection'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('crash-sound-detection'),
    __metadata("design:paramtypes", [crash_sound_detection_service_1.CrashSoundDetectionService])
], CrashSoundDetectionController);
//# sourceMappingURL=crash-sound-detection.controller.js.map