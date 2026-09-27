import { Test, TestingModule } from '@nestjs/testing';
import { EmergencyContactsService } from './emergency-contacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderContactsDto } from './dto/reorder-contacts.dto';

describe('EmergencyContactsService - reorder', () => {
  let service: EmergencyContactsService;
  let prismaMock: any;

  const mockUserId = 'user-uuid-123';
  const existingContacts = [
    { id: 'c-1', userId: mockUserId, priorityOrder: 1, name: 'Mom' },
    { id: 'c-2', userId: mockUserId, priorityOrder: 2, name: 'Dad' },
    { id: 'c-3', userId: mockUserId, priorityOrder: 3, name: 'Brother' },
  ];

  beforeEach(async () => {
    prismaMock = {
      emergencyContact: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve([...existingContacts])),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const contact = existingContacts.find((c) => c.id === where.id);
          if (contact) {
            contact.priorityOrder = data.priorityOrder;
          }
          return Promise.resolve(contact);
        }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyContactsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<EmergencyContactsService>(EmergencyContactsService);
  });

  it('should successfully reorder contacts cleanly without errors', async () => {
    const reorderDto: ReorderContactsDto = {
      orders: [
        { contactId: 'c-3', priorityOrder: 1 },
        { contactId: 'c-1', priorityOrder: 2 },
        { contactId: 'c-2', priorityOrder: 3 },
      ],
    };

    const result = await service.reorder(mockUserId, reorderDto);

    expect(prismaMock.emergencyContact.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      orderBy: { priorityOrder: 'asc' },
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should handle payload with id property instead of contactId', async () => {
    const reorderDto: any = {
      orders: [
        { id: 'c-2', priorityOrder: 1 },
        { id: 'c-3', priorityOrder: 2 },
        { id: 'c-1', priorityOrder: 3 },
      ],
    };

    const result = await service.reorder(mockUserId, reorderDto);

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
