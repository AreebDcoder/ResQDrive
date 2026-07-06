import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private incidentsService: IncidentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new incident record (manual or auto-detected)' })
  @ApiResponse({ status: 201, description: 'Incident created successfully.' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateIncidentDto,
  ) {
    return this.incidentsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List incidents for the current user with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of incidents.' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Query() query: QueryIncidentsDto,
  ) {
    return this.incidentsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single incident by ID' })
  @ApiResponse({ status: 200, description: 'Incident details.' })
  @ApiResponse({ status: 404, description: 'Incident not found.' })
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.incidentsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an incident record' })
  @ApiResponse({ status: 200, description: 'Incident updated.' })
  @ApiResponse({ status: 404, description: 'Incident not found.' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidentsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an incident record' })
  @ApiResponse({ status: 200, description: 'Incident deleted.' })
  @ApiResponse({ status: 404, description: 'Incident not found.' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.incidentsService.remove(user.id, id);
  }
}