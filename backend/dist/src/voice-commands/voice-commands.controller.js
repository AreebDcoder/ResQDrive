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
exports.VoiceCommandsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const voice_commands_service_1 = require("./voice-commands.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const create_voice_log_dto_1 = require("./dto/create-voice-log.dto");
let VoiceCommandsController = class VoiceCommandsController {
    constructor(voiceCommandsService) {
        this.voiceCommandsService = voiceCommandsService;
    }
    async logCommand(user, dto) {
        return this.voiceCommandsService.logCommand(user.id, dto);
    }
    async getHistory(user, page, limit) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        return this.voiceCommandsService.getHistory(user.id, pageNum, limitNum);
    }
};
exports.VoiceCommandsController = VoiceCommandsController;
__decorate([
    (0, common_1.Post)('log'),
    (0, swagger_1.ApiOperation)({ summary: 'Log a recognized voice command and its outcome' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_voice_log_dto_1.CreateVoiceLogDto]),
    __metadata("design:returntype", Promise)
], VoiceCommandsController.prototype, "logCommand", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated history of the user's voice command logs for debugging" }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], VoiceCommandsController.prototype, "getHistory", null);
exports.VoiceCommandsController = VoiceCommandsController = __decorate([
    (0, swagger_1.ApiTags)('Voice Commands'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('voice-commands'),
    __metadata("design:paramtypes", [voice_commands_service_1.VoiceCommandsService])
], VoiceCommandsController);
//# sourceMappingURL=voice-commands.controller.js.map