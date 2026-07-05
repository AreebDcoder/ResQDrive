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
exports.EmergencyContactsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const emergency_contacts_service_1 = require("./emergency-contacts.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const create_contact_dto_1 = require("./dto/create-contact.dto");
const reorder_contacts_dto_1 = require("./dto/reorder-contacts.dto");
let EmergencyContactsController = class EmergencyContactsController {
    constructor(contactsService) {
        this.contactsService = contactsService;
    }
    async create(user, createContactDto) {
        return this.contactsService.create(user.id, createContactDto);
    }
    async findAll(user) {
        return this.contactsService.findAll(user.id);
    }
    async getQuickAccess(user) {
        return this.contactsService.getQuickAccess(user.id);
    }
    async findOne(user, id) {
        return this.contactsService.findOne(user.id, id);
    }
    async reorder(user, reorderDto) {
        return this.contactsService.reorder(user.id, reorderDto);
    }
    async update(user, id, updateContactDto) {
        return this.contactsService.update(user.id, id, updateContactDto);
    }
    async delete(user, id) {
        return this.contactsService.delete(user.id, id);
    }
};
exports.EmergencyContactsController = EmergencyContactsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new emergency contact (max 5)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Contact successfully created.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_contact_dto_1.CreateContactDto]),
    __metadata("design:returntype", Promise)
], EmergencyContactsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all emergency contacts ordered by priority' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmergencyContactsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('quick-access'),
    (0, swagger_1.ApiOperation)({ summary: 'Get lightweight contacts payload for dashboard caching' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmergencyContactsController.prototype, "getQuickAccess", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get single contact details' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmergencyContactsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('reorder'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reorder contact priorities bulk transaction' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reorder_contacts_dto_1.ReorderContactsDto]),
    __metadata("design:returntype", Promise)
], EmergencyContactsController.prototype, "reorder", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update contact details' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], EmergencyContactsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an emergency contact and re-sequence remaining priorities' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmergencyContactsController.prototype, "delete", null);
exports.EmergencyContactsController = EmergencyContactsController = __decorate([
    (0, swagger_1.ApiTags)('Emergency Contacts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('emergency-contacts'),
    __metadata("design:paramtypes", [emergency_contacts_service_1.EmergencyContactsService])
], EmergencyContactsController);
//# sourceMappingURL=emergency-contacts.controller.js.map