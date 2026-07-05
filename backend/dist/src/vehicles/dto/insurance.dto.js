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
exports.InsuranceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class InsuranceDto {
}
exports.InsuranceDto = InsuranceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'EFU General Insurance' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InsuranceDto.prototype, "providerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'POL-1234567-XYZ' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InsuranceDto.prototype, "policyNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'Comprehensive' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InsuranceDto.prototype, "coverageType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: '2027-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], InsuranceDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: '111-338-111' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InsuranceDto.prototype, "emergencyHelpline", void 0);
//# sourceMappingURL=insurance.dto.js.map