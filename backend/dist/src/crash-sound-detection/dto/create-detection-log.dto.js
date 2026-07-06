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
exports.CreateDetectionLogDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateDetectionLogDto {
}
exports.CreateDetectionLogDto = CreateDetectionLogDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'd3b07384-d113-49c3-a558-f58c42a229a4' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'Incident ID must be a valid UUID v4.' }),
    __metadata("design:type", String)
], CreateDetectionLogDto.prototype, "incidentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-06T00:51:27Z' }),
    (0, class_validator_1.IsDateString)({}, { message: 'Window timestamp must be a valid ISO-8601 date string.' }),
    __metadata("design:type", String)
], CreateDetectionLogDto.prototype, "windowTimestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'Skidding' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDetectionLogDto.prototype, "topMatchedClass", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.85 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateDetectionLogDto.prototype, "crashConfidence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.3 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateDetectionLogDto.prototype, "thresholdUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateDetectionLogDto.prototype, "flaggedAsCrash", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateDetectionLogDto.prototype, "combinedWithSensorSignal", void 0);
//# sourceMappingURL=create-detection-log.dto.js.map